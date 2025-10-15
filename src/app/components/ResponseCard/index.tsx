import { useState, useEffect } from "react";
import styles from "./index.module.scss";
import { parseHtmlForAuthForms, AuthForm } from "../../utils/htmlParser";
import Authentication from "../Authentication";

interface HtmlResponse {
  html: string;
  url: string;
  status: number;
  contentType: string;
  contentLength: number;
}

interface ErrorResponse {
  error: string;
  status?: number;
  contentType?: string;
}

export default function ResponseCard({
  url, 
  id, 
  removeUrl, 
  isExpanded, 
  onToggle
}: {
  url: string, 
  id: string, 
  removeUrl: (id: string) => void,
  isExpanded: boolean,
  onToggle: () => void
}) {
    const [htmlResponse, setHtmlResponse] = useState<HtmlResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [authForm, setAuthForm] = useState<AuthForm | null>(null);

    const fetchHtml = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/fetch-html', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to fetch HTML');
                // Even if there's an error, try to parse any HTML that might be available
                if (data.html) {
                    const parsedAuthForm = parseHtmlForAuthForms(data.html);
                    setAuthForm(parsedAuthForm);
                }
                return;
            }

            setHtmlResponse(data);
            
            // Parse HTML for authentication forms
            if (data.html) {
                const parsedAuthForm = parseHtmlForAuthForms(data.html);
                setAuthForm(parsedAuthForm);
            }
        } catch (err) {
            setError('Network error occurred');
            // Don't clear authForm state on network error - preserve any existing data
        } finally {
            setLoading(false);
        }
    };

    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname;
        } catch {
            return url.split("://")[1]?.split("/")[0] || url;
        }
    };

    return (
        <div className={`${styles.container} ${isExpanded ? styles.expanded : ''}`}>
            <div className={styles.header}>
                <h1>{getDomain(url)}</h1>
                <img 
                  src="/close.png" 
                  alt="Remove" 
                  className={styles.remove} 
                  onClick={() => removeUrl(id)}
                />
            </div>
            
            <div className={styles.url}>
                <small>{url}</small>
            </div>

            {!htmlResponse && !error && (
                <button 
                    className={styles.fetchButton} 
                    onClick={fetchHtml}
                    disabled={loading}
                >
                    {loading ? 'Fetching...' : 'Fetch HTML'}
                </button>
            )}

            {loading && (
                <div className={styles.loading}>
                    <p>Loading HTML response...</p>
                </div>
            )}

            {error && !authForm && (
                <div className={styles.error}>
                    <p>Error: {error}</p>
                    <button onClick={fetchHtml} className={styles.retryButton}>
                        Retry
                    </button>
                </div>
            )}

            {(htmlResponse || authForm) && (
                <div className={styles.response}>
                    <div className={styles.responseInfo}>
                        <p><span className={authForm?.hasPasswordInput ? styles.authFound : styles.authNotFound}>
                                {authForm?.hasPasswordInput ? 'Form Detected' : 'No Form Detected'}
                            </span>
                        </p>
                    </div>
                    <p className={styles.note}><span>{authForm?.hasPasswordInput ? 'Click on show details to see more.' : 'Note: Guardrails or JS may be preventing access.'}</span></p>
                    
                    {/* Authentication Form Detection */}
                    {authForm && authForm.hasPasswordInput && (
                        <Authentication 
                            authForm={authForm}
                            isVisible={isExpanded}
                            onToggle={onToggle}
                        />
                    )}
                </div>
            )}
        </div>
    )
}