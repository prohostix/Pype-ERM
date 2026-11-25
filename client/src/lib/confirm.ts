// Ask the user to confirm an action, or type remarks, in the app's own popup (rendered by <ConfirmDialogHost /> in main.tsx).
//   if (!(await confirmDialog({ title: 'Delete task?', message: 'Delete this task?', confirmText: 'Delete', tone: 'danger' }))) return;

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** `danger` for actions that remove or end something. */
  tone?: 'danger' | 'default';
}

export interface PromptOptions extends ConfirmOptions {
  /** Label above the text box. */
  inputLabel: string;
  placeholder?: string;
  /** The confirm button stays disabled until something is typed. */
  required?: boolean;
}

export interface DialogRequest extends ConfirmOptions {
  /** Present when the popup also asks for text. */
  input?: { label: string; placeholder?: string; required?: boolean };
  /** The typed text (empty without a text box), or null when cancelled. */
  resolve: (result: string | null) => void;
}

let show: ((request: DialogRequest) => void) | null = null;

export const registerConfirmHost = (host: typeof show) => { show = host; };

const ask = (request: Omit<DialogRequest, 'resolve'>): Promise<string | null> =>
  new Promise((resolve) => {
    // Without the host nothing can be asked, so the action is not carried out
    if (!show) { resolve(null); return; }
    show({ ...request, resolve });
  });

/** Resolves true only when the user presses the confirm button. */
export const confirmDialog = (options: ConfirmOptions): Promise<boolean> =>
  ask(options).then((result) => result !== null);

/** Asks for text. Resolves with the trimmed text, or null when the user cancels. */
export const promptDialog = ({ inputLabel, placeholder, required, ...options }: PromptOptions): Promise<string | null> =>
  ask({ ...options, input: { label: inputLabel, placeholder, required } });
