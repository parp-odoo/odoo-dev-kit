import * as vscode from "vscode";
import { getPrompt } from "../../utils/prompts";

type HandlerPayload = {
	text?: string;
};

export class CopilotService {
	public isActive = false;

	private model?: vscode.LanguageModelChat;
	private readonly cancellationTokens = new Map<string, vscode.CancellationTokenSource>();

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly webview: vscode.Webview,
	) {
		void this.checkAvailable();

		this.context.subscriptions.push(
			vscode.lm.onDidChangeChatModels(() => this.checkAvailable()),
		);
	}

	public readonly handlers = {
		improveCommit: (message: HandlerPayload) => this.improveCommit(message),
	};

	private async checkAvailable() {
		try {
			const [model] = await vscode.lm.selectChatModels({ vendor: "copilot" });
			this.model = model;
		} catch {
			this.model = undefined;
		}
		this.updateAvailability(Boolean(this.model));
	}

	private updateAvailability(available: boolean) {
		this.isActive = available;
		this.webview.postMessage({
			command: "copilotStatus",
			available,
		});
	}

	public dispose() {
		for (const token of this.cancellationTokens.values()) {
			token.cancel();
			token.dispose();
		}
		this.cancellationTokens.clear();
	}

	private createCancellation(key: string): vscode.CancellationTokenSource {
		const existing = this.cancellationTokens.get(key);
		if (existing) {
			existing.cancel();
			existing.dispose();
		}

		const token = new vscode.CancellationTokenSource();
		this.cancellationTokens.set(key, token);
		return token;
	}

	private async makeRequest(prompt: string, token: vscode.CancellationToken): Promise<string> {
		if (!this.model) {
			throw new Error("GitHub Copilot Chat is unavailable.");
		}

		const response = await this.model.sendRequest(
			[vscode.LanguageModelChatMessage.User(prompt)],
			{},
			token,
		);

		let result = "";
		for await (const chunk of response.text) {
			result += chunk;
		}

		return result.trim();
	}

	private async improveCommit({ text = "" }: HandlerPayload) {
		const cancellation = this.createCancellation("improveCommit");

		try {
			const prompt = getPrompt("IMP_COMMIT", { raw: text });
			const improved = await this.makeRequest(prompt, cancellation.token);

			if (!cancellation.token.isCancellationRequested) {
				this.webview.postMessage({
					command: "commitImproved",
					text: improved,
				});
			}
		} catch (error: unknown) {
			if (cancellation.token.isCancellationRequested) {
				return;
			}
			const message =
				error instanceof Error ? error.message : "Failed to improve commit message.";
			this.webview.postMessage({
				command: "commitError",
				message,
			});
		} finally {
			this.cancellationTokens.delete("improveCommit");
			cancellation.dispose();
		}
	}
}
