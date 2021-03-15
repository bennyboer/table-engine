import {InlineWorker} from "./util/worker/inline-worker";

/**
 * Entry point of the table engine library.
 */
export class TableEngine {
	constructor() {
		const worker: TestWorker = new TestWorker();

		worker.postMessage("What are you doing?");
	}
}

export class TestWorker extends InlineWorker<string>{

	constructor() {
		super(function(this: any) {
			const self = this;

			self.onmessage = (message: MessageEvent<string>) => {
				console.log(`Received message in TestWorker: ${message.data}`);

				self.postMessage("Hello World");
			}
		});

		this.onMessage().subscribe((message) => {
			console.log(`Received message in main thread: ${message.data}`);
		});
	}

}
