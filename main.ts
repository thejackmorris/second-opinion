import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as https from 'https';
import { IncomingMessage } from 'http';

async function askAnthropic(plugin: SecondOpinion, question: string): Promise<any> {
	// Confirms that the user has set the Anthropic API key
	// Does not confirm that the key is valid
	if (!plugin.settings.anthropicApiKey) {
		throw new Error('Anthropic API key not set. Please set your API key in the plugin settings.');
	}
	
	console.log('Confirming API key is set:', 'Key is set');
	
	return new Promise((resolve, reject) => {
		const data = JSON.stringify({
			model: "claude-3-7-sonnet-20250219",
			max_tokens: 1024,
			messages: [
				{
					role: "user",
					content: question
				}
			]
		});

		const options = {
			hostname: 'api.anthropic.com',
			path: '/v1/messages',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'anthropic-version': '2023-06-01',
				'Content-Length': Buffer.byteLength(data),
				'x-api-key': plugin.settings.anthropicApiKey
			}
		};

		console.log('Request data:', data);
		console.log('Request headers:', options.headers);

		const req = https.request(options, (res: IncomingMessage) => {
			let responseData = '';

			res.on('data', (chunk: Buffer) => {
				responseData += chunk;
			});

			res.on('end', () => {
				console.log('Response status:', res.statusCode);
				console.log('Response headers:', res.headers);
				console.log('Response data:', responseData);
				
				if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
					try {
						const parsedData = JSON.parse(responseData);
						resolve(parsedData);
					} catch (error) {
						console.error('Failed to parse response:', error);
						reject(new Error('Failed to parse response'));
					}
				} else {
					console.error('API Error Response:', responseData);
					reject(new Error(`API request failed: ${res.statusCode} ${res.statusMessage}`));
				}
			});
		});

		req.on('error', (error: Error) => {
			console.error('Request error:', error);
			reject(error);
		});

		req.write(data);
		req.end();
	});
}

interface SecondOpinionSettings {
	anthropicApiKey: string;
}

const DEFAULT_SETTINGS: SecondOpinionSettings = {
	anthropicApiKey: ''
}

export default class SecondOpinion extends Plugin {
	settings: SecondOpinionSettings;

	async onload() {
		try {
			await this.loadSettings();

			// This creates an icon in the left ribbon.
			const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new Notice('This is a notice!');
			});
			// Perform additional things with the ribbon
			ribbonIconEl.addClass('my-plugin-ribbon-class');

			// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
			const statusBarItemEl = this.addStatusBarItem();
			statusBarItemEl.setText('Status Bar Text');

			// This adds a simple command that can be triggered anywhere
			this.addCommand({
				id: 'open-sample-modal-simple',
				name: 'Open sample modal (simple)',
				callback: () => {
					new SampleModal(this.app).open();
				}
			});
			// This adds an editor command that can perform some operation on the current editor instance
			this.addCommand({
				id: 'sample-editor-command',
				name: 'Sample editor command',
				editorCallback: (editor: Editor, view: MarkdownView) => {
					console.log(editor.getSelection());
					editor.replaceSelection('Sample Editor Command');
				}
			});
			// This adds a complex command that can check whether the current state of the app allows execution of the command
			this.addCommand({
				id: 'open-sample-modal-complex',
				name: 'Open sample modal (complex)',
				checkCallback: (checking: boolean) => {
					// Conditions to check
					const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (markdownView) {
						// If checking is true, we're simply "checking" if the command can be run.
						// If checking is false, then we want to actually perform the operation.
						if (!checking) {
							new SampleModal(this.app).open();
						}

						// This command will only show up in Command Palette when the check function returns true
						return true;
					}
				}
			});

			this.addCommand({
				id: 'quick-question',
				name: 'Quick Question',
				editorCallback: async (editor: Editor, view: MarkdownView) => {
					if (!this.settings.anthropicApiKey) {
						new Notice('Please set your Anthropic API key in the plugin settings');
						return;
					}
					
					new QuickQuestionModal(this.app, editor, async (question: string) => {
						// Insert the question
						editor.replaceSelection('\n' + question + '\n');
						
						try {
							// Get response from Anthropic
							const response = await askAnthropic(this, question);
							
							// Insert the response
							if (response.content && response.content[0] && response.content[0].text) {
								editor.replaceSelection(response.content[0].text + '\n');
							} else {
								new Notice('Unexpected response format from Anthropic');
								console.error('Unexpected response format:', response);
							}
						} catch (error) {
							console.error('Anthropic API Error:', error);
							if (error instanceof Error) {
								new Notice(`Error: ${error.message}`);
							} else {
								new Notice('Error getting response from Anthropic');
							}
						}
					}).open();
				}
			});
			// This adds a settings tab so the user can configure various aspects of the plugin
			this.addSettingTab(new SampleSettingTab(this.app, this));

			// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
			// Using this function will automatically remove the event listener when this plugin is disabled.
			this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
				console.log('click', evt);
			});

			// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
			this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
		} catch (error) {
			console.error('Error loading Second Opinion plugin:', error);
			new Notice('Failed to load Second Opinion plugin. Check console for details.');
		}
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: SecondOpinion;

	constructor(app: App, plugin: SecondOpinion) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Anthropic API Key')
			.setDesc('Enter your Anthropic API key')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.anthropicApiKey)
				.onChange(async (value) => {
					this.plugin.settings.anthropicApiKey = value;
					await this.plugin.saveSettings();
				}));
	}
}

class QuickQuestionModal extends Modal {
	editor: Editor;
	onSubmit: (question: string) => void;

	constructor(app: App, editor: Editor, onSubmit: (question: string) => void) {
		super(app);
		this.editor = editor;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.createEl('h2', {text: 'Ask a Question'});
		
		const input = contentEl.createEl('textarea', {
			attr: {
				placeholder: 'Type your question here...',
				rows: '4'
			}
		});
		
		const buttonContainer = contentEl.createDiv('button-container');
		const submitButton = buttonContainer.createEl('button', {
			text: 'Submit',
			cls: 'mod-cta'
		});
		
		submitButton.addEventListener('click', () => {
			const question = input.value;
			if (question) {
				this.onSubmit(question);
				this.close();
			}
		});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
