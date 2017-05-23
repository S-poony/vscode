/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as interfaces from './interfaces';
import { loadMessageBundle } from 'vscode-nls';
const localize = loadMessageBundle();

export default class MergeConflictCodeLensProvider implements vscode.CodeLensProvider, vscode.Disposable {

	private disposables: vscode.Disposable[] = [];
	private config: interfaces.IExtensionConfiguration;

	constructor(private context: vscode.ExtensionContext, private tracker: interfaces.IDocumentMergeConflictTracker) {
	}

	begin(config: interfaces.IExtensionConfiguration) {
		this.config = config;
		this.disposables.push(
			vscode.languages.registerCodeLensProvider({ pattern: '**/*' }, this)
		);
	}

	configurationUpdated(config: interfaces.IExtensionConfiguration) {
		this.config = config;
	}

	dispose() {
		this.disposables.forEach(disposable => disposable.dispose());
		this.disposables = [];
	}

	async provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.CodeLens[] | null> {

		if (!this.config || !this.config.enableCodeLens) {
			return null;
		}

		let conflicts = await this.tracker.getConflicts(document);

		if (!conflicts || conflicts.length === 0) {
			return null;
		}

		let items: vscode.CodeLens[] = [];

		conflicts.forEach(conflict => {
			let acceptCurrentCommand: vscode.Command = {
				command: 'merge-conflict.accept.current',
				title: localize('acceptCurrentChange', 'Accept current change'),
				arguments: ['known-conflict', conflict]
			};

			let acceptIncomingCommand: vscode.Command = {
				command: 'merge-conflict.accept.incoming',
				title: localize('acceptIncomingChange', 'Accept incoming change'),
				arguments: ['known-conflict', conflict]
			};

			let acceptBothCommand: vscode.Command = {
				command: 'merge-conflict.accept.both',
				title: localize('acceptBothChanges', 'Accept both changes'),
				arguments: ['known-conflict', conflict]
			};

			let diffCommand: vscode.Command = {
				command: 'merge-conflict.compare',
				title: localize('compareChanges', 'Compare changes'),
				arguments: [conflict]
			};

			items.push(
				new vscode.CodeLens(conflict.range, acceptCurrentCommand),
				new vscode.CodeLens(conflict.range.with(conflict.range.start.with({ character: conflict.range.start.character + 1 })), acceptIncomingCommand),
				new vscode.CodeLens(conflict.range.with(conflict.range.start.with({ character: conflict.range.start.character + 2 })), acceptBothCommand),
				new vscode.CodeLens(conflict.range.with(conflict.range.start.with({ character: conflict.range.start.character + 3 })), diffCommand)
			);
		});

		return items;
	}
}
