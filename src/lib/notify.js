import toast from 'react-hot-toast';
import { errMessage } from './api';

/** Runs a Firestore write and reports the outcome as a toast. Resolves true on success. */
export async function notify(promise, successMessage) {
  try {
    await promise;
    if (successMessage) toast.success(successMessage);
    return true;
  } catch (e) {
    toast.error(errMessage(e));
    return false;
  }
}
