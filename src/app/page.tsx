"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import validator from "validator";
import styles from "./page.module.scss";
import ResponseCard from "./components/ResponseCard";
import Status from "./components/Status";

export default function Home() {
  const [input, setInput] = useState<string>("");
  const [urls, setUrls] = useState<Array<{id: string, url: string}>>([]);
  const [message, setMessage] = useState<Record<string, any>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [showInputForm, setShowInputForm] = useState<boolean>(true);
  const [showScrollArrows, setShowScrollArrows] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Load URLs from localStorage after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('getcovered-urls');
      if (saved) {
        setUrls(JSON.parse(saved));
      }
      setIsHydrated(true);
    }
  }, []);
  
  // Save URLs to localStorage whenever they change (only after hydration)
  useEffect(() => {
    if (isHydrated && typeof window !== 'undefined') {
      localStorage.setItem('getcovered-urls', JSON.stringify(urls));
    }
  }, [urls, isHydrated]);
  
  // Prevent browser navigation and maintain SPA behavior
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Replace current history state to prevent back button issues
      window.history.replaceState({ page: 'getcovered' }, '', window.location.href);
      
      // Prevent page unload that might cause state loss
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        // Don't prevent unload, just ensure state is saved
        localStorage.setItem('getcovered-urls', JSON.stringify(urls));
      };
      
      // Handle popstate (back/forward button)
      const handlePopState = (e: PopStateEvent) => {
        // Replace the state to prevent navigation away
        window.history.replaceState({ page: 'getcovered' }, '', window.location.href);
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [urls]);
  
  const scrollLeft = () => {
    if (containerRef.current) {
      const scrollAmount = 466; // Card width + gap
      containerRef.current.scrollBy({
        left: -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (containerRef.current) {
      const scrollAmount = 466; // Card width + gap
      containerRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const checkScrollNeeded = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const needsScroll = container.scrollWidth > container.clientWidth;
      setShowScrollArrows(needsScroll);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validate URL
    if (!input.trim()) {
      setMessage({text: "Please enter a URL.", error: true});
      return;
    }
    
    // Normalize URL (add protocol if missing)
    let normalizedUrl = input.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    // Validate URL format
    if (!validator.isURL(normalizedUrl, { 
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true
    })) {
      setMessage({text: "Please enter a valid URL.", error: true});
      return;
    }
    
    // Check for duplicates
    if (urls.some(item => item.url === normalizedUrl)) {
      setMessage({text: "This URL has already been added.", error: true});
      return;
    }
    
    // Check URL limit
    if (urls.length >= 5) {
      setMessage({text: "5 URLs limit reached.", error: true});
      return;
    }
    
    // Add valid URL with unique ID
    const newUrlItem = {
      id: `url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: normalizedUrl
    };
    setUrls([...urls, newUrlItem]);
    setInput("");
    
    // Auto-scroll to the newly added URL after a short delay to allow DOM update
    setTimeout(() => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerScrollWidth = containerRef.current.scrollWidth;
        
        // Check if content extends past container width (horizontal overflow)
        if (containerScrollWidth > containerWidth) {
          // Calculate scroll position to show the new card
          const cardWidth = 450; // ResponseCard width
          const cardGap = 16; // 1em gap between cards (assuming 16px base font size)
          const totalCardWidth = cardWidth + cardGap;
          const newCardIndex = urls.length; // Index of the newly added card
          const scrollToPosition = newCardIndex * totalCardWidth;
          
          // Smooth horizontal scroll to the new card
          containerRef.current.scrollTo({
            left: scrollToPosition,
            behavior: 'smooth'
          });
        }
        
        // Check if scroll arrows are needed after adding the new card
        checkScrollNeeded();
      }
    }, 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Clear previous messages when user starts typing
    if (message.text) {
      setMessage({text: "", error: false});
    }
    
    // Provide real-time validation feedback
    if (value.trim()) {
      let normalizedUrl = value.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }
      
      if (validator.isURL(normalizedUrl, { 
        protocols: ['http', 'https'],
        require_protocol: true,
        require_valid_protocol: true
      })) {
        if (urls.some(item => item.url === normalizedUrl)) {
          setMessage({text: "This URL has already been added.", error: true});
        }
      } else {
        setMessage({text: "Invalid URL format", error: true});
      }
    }
  };

  const removeUrl = (id: string) => {
    setUrls(urls.filter(item => item.id !== id));
    // If the removed card was expanded, clear the expanded state
    if (expandedCardId === id) {
      setExpandedCardId(null);
    }
  };

  const handleCardToggle = (cardId: string) => {
    // If clicking the same card, toggle it off
    if (expandedCardId === cardId) {
      setExpandedCardId(null);
    } else {
      // Otherwise, expand this card and collapse others
      setExpandedCardId(cardId);
    }
  };

  useEffect(() => {
    if(urls.length === 0 && !input.trim()) {
      setMessage({text: "Please add a URL to continue.", error: false});
    } else {
      setMessage({text: "", error: false});
    }
  }, [urls, input]);

  // Check if scroll arrows are needed when URLs change
  useEffect(() => {
    if (isHydrated && urls.length > 0) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(checkScrollNeeded, 100);
    }
  }, [urls, isHydrated, checkScrollNeeded]);

  // Check scroll on window resize
  useEffect(() => {
    const handleResize = () => {
      checkScrollNeeded();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScrollNeeded]);

  return (
    <div className={styles.page}>
      <h1 className={styles.assessmentTitle}>getcovered <i>Challenge Submission</i></h1>
      <Status message={message.text} setMessage={setMessage} error={message.error} />
      <main className={styles.main}>
        {!urls.length ? <div className={styles.emptyState}><p>No URLs added yet.</p></div> : <></>}
        <div className={`${styles.formSection} ${!showInputForm ? styles.collapsed : ''}`}>
          <div className={`${styles.glassForm} ${!showInputForm ? styles.collapsed : ''}`}>
            <form onSubmit={handleSubmit} action="#" method="post">
            <div className={styles.inputGroup}>
              <button 
                type="button"
                className={styles.toggleFormButton}
                onClick={() => setShowInputForm(!showInputForm)}
                title={showInputForm ? "Hide input form" : "Show input form"}
              >
                {showInputForm ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 15l-6-6-6 6"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                )}
              </button>
              
              {showInputForm && (
                <>
                  <input 
                    value={input} 
                    onChange={handleInputChange} 
                    type="text" 
                    placeholder="Enter a url (e.g., example.com or https://example.com)" 
                    className={styles.urlInput}
                  />
                  <input 
                    type="submit" 
                    value="Add URL" 
                    className={styles.submitButton}
                    disabled={!input.trim() || message.error}
                  />
                </>
              )}
            </div>
            
            {showInputForm && (
              <div className={styles.urlCounter}>
                URLs added: {urls.length}/5
              </div>
            )}
                <footer className={styles.formFooter}>
                  <p>some authentication forms may remain undetected due to restricted access.</p>
                </footer>
            </form>
          </div>
        </div>
        <div 
          ref={containerRef}
          className={styles.scrollContainer}
        >
          {showScrollArrows && (
            <button 
              className={styles.scrollArrowLeft}
              onClick={scrollLeft}
              aria-label="Scroll left"
            >
              ‹
            </button>
          )}
          <div className={ urls.length > 0 ? styles.responseCards : ""}>
            {
              urls.map((urlItem) => (
                <ResponseCard 
                  removeUrl={removeUrl} 
                  id={urlItem.id} 
                  key={urlItem.id} 
                  url={urlItem.url}
                  isExpanded={expandedCardId === urlItem.id}
                  onToggle={() => handleCardToggle(urlItem.id)}
                />
              ))
            }
          </div>
          {showScrollArrows && (
            <button 
              className={styles.scrollArrowRight}
              onClick={scrollRight}
              aria-label="Scroll right"
            >
              ›
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
