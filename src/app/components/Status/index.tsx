import { Dispatch, SetStateAction, useEffect } from "react";
import styles from "./index.module.scss";

export default function Status({message, setMessage, error = false}: {message: string, setMessage: Dispatch<SetStateAction<Record<string, any>>>, error: boolean}) {
    // Auto-dismiss after 4 seconds
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                setMessage({});
            }, 4000);
            
            return () => clearTimeout(timer);
        }
    }, [message, setMessage]);

    if (!message) return null;

    return (
        <div className={`${styles.toaster} ${error ? styles.error : styles.success}`}>
            <div className={styles.content}>
                <div className={styles.message}>{message}</div>
                <button 
                    className={styles.closeButton}
                    onClick={() => setMessage({})}
                    aria-label="Close notification"
                >
                    ×
                </button>
            </div>
        </div>
    )
}