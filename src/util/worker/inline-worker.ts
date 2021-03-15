import {Observable, Subject} from "rxjs";
import {takeUntil} from "rxjs/operators";

/**
 * Inlined web worker.
 */
export abstract class InlineWorker<M> {
	/**
	 * Reference to the actual worker.
	 */
	private readonly _worker: Worker;

	/**
	 * Subject emitting an event when the worker is terminated.
	 */
	private readonly _onTerminate = new Subject<void>();

	/**
	 * Subject emitting message events.
	 */
	private readonly _onMessage = new Subject<MessageEvent>();

	/**
	 * Subject emitting error events.
	 */
	private readonly _onError = new Subject<ErrorEvent>();

	protected constructor(workerFunction: () => void) {
		const webWorkersSupported = !!Worker;

		if (webWorkersSupported) {
			const functionBody = workerFunction
				.toString()
				.replace(/^[^{]*{\s*/, "")
				.replace(/\s*}[^}]*$/, "");

			// Create worker
			this._worker = new Worker(
				URL.createObjectURL(
					new Blob([functionBody], { type: "text/javascript" })
				)
			);

			this._worker.onmessage = (data: MessageEvent) => {
				this._onMessage.next(data);
			};

			this._worker.onerror = (data: ErrorEvent) => {
				this._onError.next(data);
			};
		} else {
			throw new Error("WebWorker in browser is not enabled");
		}
	}

	/**
	 * Post a message over the the websocket.
	 * @param message to send
	 */
	public postMessage(message: M): void {
		this._worker.postMessage(message);
	}

	/**
	 * Listen to incoming messages.
	 */
	protected onMessage(): Observable<MessageEvent> {
		return this._onMessage.asObservable().pipe(takeUntil(this._onTerminate));
	}

	/**
	 * Listen to error messages.
	 */
	protected onError(): Observable<ErrorEvent> {
		return this._onError.asObservable().pipe(takeUntil(this._onTerminate));
	}

	/**
	 * Cleanup the web worker.
	 */
	public cleanup(): void {
		this._onMessage.complete();
		this._onError.complete();

		this._worker.terminate();
	}
}
