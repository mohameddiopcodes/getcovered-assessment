import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./index.module.scss";
import { AuthForm } from "../../utils/htmlParser";
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/themes/prism-tomorrow.css';

// Function to format HTML with proper indentation
function formatHtml(html: string): string {
  if (!html) return 'No parent element found';
  
  // Remove extra whitespace and normalize
  let formatted = html.replace(/>\s+</g, '><').trim();
  
  // Add line breaks and indentation
  let result = '';
  let indentLevel = 0;
  const indentSize = 2;
  
  // Split by tags but keep the tags
  const parts = formatted.split(/(<[^>]*>)/);
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    if (part.startsWith('</')) {
      // Closing tag - decrease indent before adding
      indentLevel = Math.max(0, indentLevel - 1);
      result += ' '.repeat(indentLevel * indentSize) + part + '\n';
    } else if (part.startsWith('<') && !part.startsWith('</')) {
      // Opening tag - add with current indent, then increase
      result += ' '.repeat(indentLevel * indentSize) + part;
      
      // Check if it's a self-closing tag
      if (part.endsWith('/>') || part.match(/<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)/i)) {
        result += '\n';
      } else {
        result += '\n';
        indentLevel++;
      }
    } else if (part.trim()) {
      // Text content - add with current indent
      result += ' '.repeat(indentLevel * indentSize) + part.trim() + '\n';
    }
  }
  
  return result.trim();
}

interface AuthenticationProps {
  authForm: AuthForm;
  isVisible: boolean;
  onToggle: () => void;
}

export default function Authentication({ authForm, isVisible, onToggle }: AuthenticationProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showExpandedHtml, setShowExpandedHtml] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(11);

  // Highlight HTML when modal opens
  useEffect(() => {
    if (isVisible || showExpandedHtml) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        Prism.highlightAll();
      }, 100);
    }
  }, [isVisible, showExpandedHtml]);

  // Font size control functions
  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 1, 20)); // Max 20px
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 1, 8)); // Min 8px
  };

  if (!authForm.hasPasswordInput) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <img src="/lock.png" alt="Lock" className={styles.icon} />
          <span>Auth Detected</span>
        </div>
        <button 
          className={styles.toggleButton}
          onClick={onToggle}
          title={isVisible ? "Hide details" : "Show details"}
        >
          {isVisible ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 15l-6-6-6 6"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          )}
        </button>
      </div>

      {isVisible && (
        <div className={styles.content}>
          {/* Default view: Raw HTML */}
          <div className={styles.rawHtml}>
            <h4>Parent Element HTML:</h4>
            <div className={styles.htmlPreview}>
              <pre className={`${styles.htmlCode} language-markup`}>
                <code>
                  {formatHtml(authForm.parentElement || '')}
                </code>
              </pre>
              <button 
                className={styles.expandButton}
                onClick={() => setShowExpandedHtml(true)}
                title="Expand HTML view"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
              </button>
            </div>
          </div>

          <div className={styles.actions}>
            <button 
              className={styles.detailsButton}
              onClick={() => setShowDetails(true)}
            >
              More Details
            </button>
          </div>

        {/* Modal: Detailed input analysis */}
        {showDetails && createPortal(
          <div className={styles.modalOverlay} onClick={() => setShowDetails(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h3>Authentication Form Details</h3>
                  <button 
                    className={styles.closeButton}
                    onClick={() => setShowDetails(false)}
                  >
                    ×
                  </button>
                </div>
                
                <div className={styles.modalBody}>
                  <div className={styles.summary}>
                    <p>Summary:</p>
                    <ul>
                      <li>{authForm.passwordInputs.length + authForm.otherInputs.length} inputs found</li>
                      <li>Example: {authForm.otherInputs.map(input => input.name || input.id || input.type).slice(0, 6).join(', ') || 'N/A'}</li>
                    </ul>
                  </div>
                  <h4>Authentication Inputs:</h4>
                  <div className={styles.inputs}>
                    {(() => {
                      // Combine all inputs and sort by type priority
                      const allInputs = [...authForm.passwordInputs, ...authForm.otherInputs];
                      
                      // Define type priority order
                      const typePriority = {
                        'text': 1,
                        'password': 2,
                        'hidden': 999 // Hidden inputs last
                      };
                      
                      // Sort inputs by type priority, then by type name
                      const sortedInputs = allInputs.sort((a, b) => {
                        const aPriority = typePriority[a.type as keyof typeof typePriority] || 3;
                        const bPriority = typePriority[b.type as keyof typeof typePriority] || 3;
                        
                        if (aPriority !== bPriority) {
                          return aPriority - bPriority;
                        }
                        
                        // If same priority, sort alphabetically by type
                        return (a.type || '').localeCompare(b.type || '');
                      });
                      
                      return sortedInputs.map((input, index) => (
                        <div key={index} className={styles.inputItem}>
                          <div className={styles.inputDetails}>
                            <span className={styles.type}>
                              {input.id ? `ID: ${input.id}` : `Type: ${input.type}`}
                            </span>
                            {input.name && <span className={styles.label}>Name: {input.name}</span>}
                            {input.id && input.type && <span className={styles.label}>Type: {input.type}</span>}
                            {input.placeholder && <span className={styles.label}>Placeholder: {input.placeholder}</span>}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
            </div>
          </div>,
          document.body
        )}
        </div>
      )}

      {/* Expanded HTML Modal */}
      {showExpandedHtml && createPortal(
        <div className={styles.modalOverlay} onClick={() => setShowExpandedHtml(false)}>
          <div className={`${styles.modalContent} ${isFullscreen ? styles.fullscreen : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>HTML Source Code</h3>
              <div className={styles.modalControls}>
                <div className={styles.fontControls}>
                  <button 
                    className={styles.fontButton}
                    onClick={decreaseFontSize}
                    title="Decrease font size"
                  >
                    −
                  </button>
                  <span className={styles.fontSizeDisplay}>{fontSize}px</span>
                  <button 
                    className={styles.fontButton}
                    onClick={increaseFontSize}
                    title="Increase font size"
                  >
                    +
                  </button>
                </div>
                <button 
                  className={styles.fullscreenButton}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                    </svg>
                  )}
                </button>
                <button 
                  className={styles.closeButton}
                  onClick={() => setShowExpandedHtml(false)}
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.expandedHtml}>
                <pre className={`${styles.htmlCode} language-markup`} style={{ fontSize: `${fontSize}px` }}>
                  <code>
                    {formatHtml(authForm.parentElement || '')}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
