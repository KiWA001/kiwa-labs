'use client';

import ParticleText from '@/components/ParticleText';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import WaterEffect from '@/components/WaterEffect';
import Image from 'next/image';
import ExcelPricing from '@/components/ExcelPricing';

type Stage = 'intro' | 'tagline' | 'landing';

export default function Home() {
  const [stage, setStage] = useState<Stage>('intro');

  // Menu Items Definition for Navigation Order
  const MENU_ITEMS = [
    { id: 'capabilities', label: 'Capabilities' },
    { id: 'why-choose-us', label: 'Why Choose Us' },
    { id: 'selected-works', label: 'Our Work' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'journal', label: 'Journal' },
    { id: 'vision-2030', label: 'Vision 2030' },
    { id: 'our-impact', label: 'Our Impact' },
    { id: 'start-a-project', label: 'Start a Project' }
  ];

  const getPrevNext = (currentId: string) => {
    const currentIndex = MENU_ITEMS.findIndex(item => item.id === currentId);
    if (currentIndex === -1) return { prev: null, next: null };
    return {
      prev: currentIndex > 0 ? MENU_ITEMS[currentIndex - 1] : null,
      next: currentIndex < MENU_ITEMS.length - 1 ? MENU_ITEMS[currentIndex + 1] : null
    };
  };


  const [direction, setDirection] = useState(1); // 1 = Next, -1 = Prev
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMenuSection, setActiveMenuSection] = useState<string | null>(null);
  const [activeJournalArticle, setActiveJournalArticle] = useState<string | null>(null);
  const [webviewUrl, setWebviewUrl] = useState<string | null>(null);
  const [rippleActive, setRippleActive] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const isTransitioningRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const menuContentRef = useRef<HTMLDivElement>(null);

  // Scroll to top when active section changes
  useEffect(() => {
    if (menuContentRef.current) {
      menuContentRef.current.scrollTop = 0;
    }
  }, [activeMenuSection]);

  const atTopReadyToCloseRef = useRef(false);

  const overlayHistoryEntryRef = useRef(false); // Track if we have pushed a history entry

  // Status Bar Theme Management
  useEffect(() => {
    // Set theme color to white
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', '#ffffff');

    // Ensure body background is white
    document.body.style.backgroundColor = '#ffffff';

    return () => {
      // Optional: cleanup
    };
  }, [isMenuOpen]);

  // Track viewport for responsive layout
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Constants for transition
  const DURATION = 1.0;

  // Handlers for swipe detection
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Ignore touches on the right edge where scroll bar is (iOS scroll bar)
      const touchX = e.touches[0].clientX;
      const windowWidth = window.innerWidth;
      if (touchX > windowWidth - 40) {
        // Touch started near right edge (scroll bar area), ignore for swipe detection
        touchStartRef.current = null;
        return;
      }
      
      touchStartRef.current = {
        x: touchX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    };



    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || isTransitioningRef.current) {
        touchStartRef.current = null;
        return;
      }

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const xDiff = touchEndX - touchStartRef.current.x; // Positive = swipe right
      const yDiff = touchStartRef.current.y - touchEndY; // Positive = swipe up
      
      // Calculate velocity (pixels per millisecond) for vertical movement only
      const duration = Date.now() - touchStartRef.current.time;
      const velocityY = duration > 0 ? Math.abs(yDiff) / duration : 0;
      
      // Check if this is a horizontal edge swipe (for opening menu)
      const isEdgeSwipe = touchStartRef.current.x < 40 && xDiff > 50 && Math.abs(xDiff) > Math.abs(yDiff) * 1.5;
      
      // Ignore very fast vertical swipes (> 1.5 px/ms) - these are momentum scrolls
      // But don't block horizontal edge swipes
      if (!isEdgeSwipe && velocityY > 1.5) {
        touchStartRef.current = null;
        return;
      }

      // Edge Swipe Right detection (Open Menu or close active section)
      if (
        touchStartRef.current.x < 40 &&
        xDiff > 50 &&
        Math.abs(xDiff) > Math.abs(yDiff) * 1.5
      ) {
        if (activeMenuSection) {
          // If viewing a menu section, close it to reveal the menu
          setActiveMenuSection(null);
        } else if (!isMenuOpen) {
          // If menu is closed, open it
          setIsMenuOpen(true);
        }
        touchStartRef.current = null;
        return;
      }

      // Threshold for Vertical Swipes
      if (Math.abs(yDiff) > 50) {
        if (yDiff > 0) {
          // Swipe Up (Next)
          if (stage === 'intro') triggerTransition('tagline', 1);
          if (stage === 'tagline') triggerTransition('landing', 1);
        } else if (yDiff < 0) {
          // Swipe Down (Prev) - Check content first
          if (activeMenuSection) {
            const container = menuContentRef.current;
            const isAtTop = !container || container.scrollTop <= 5;

            if (isAtTop && atTopReadyToCloseRef.current) {
              // Second swipe at top - close the section
              window.history.back();
              atTopReadyToCloseRef.current = false;
              // Long cooldown to prevent skipping multiple pages
              isTransitioningRef.current = true;
              setTimeout(() => { isTransitioningRef.current = false; }, 800);
            } else if (isAtTop) {
              // First swipe at top - set ready to close with delay
              atTopReadyToCloseRef.current = true;
              // Add cooldown to prevent immediate second swipe
              isTransitioningRef.current = true;
              setTimeout(() => { isTransitioningRef.current = false; }, 600);
            } else {
              // Not at top - user is just scrolling through content, don't interfere
              // Reset the ready-to-close state since they're actively scrolling
              atTopReadyToCloseRef.current = false;
            }
          } else {
            if (stage === 'tagline') triggerTransition('intro', -1);
            // Disabled reverse transition from landing to avoid aggressive scroll-jacking
            // if (stage === 'landing') triggerTransition('tagline', -1);
          }
        }
      }
      touchStartRef.current = null;
    };

    const handleWheel = (e: WheelEvent) => {
      if (isTransitioningRef.current) return;
      
      // Don't intercept wheel events when scrolling in menu content
      if (activeMenuSection && menuContentRef.current) {
        const target = e.target as HTMLElement;
        if (menuContentRef.current.contains(target)) {
          // User is scrolling within the menu content, don't handle stage transitions
          return;
        }
      }

      const delta = e.deltaY;

      if (Math.abs(delta) > 30) {
        if (delta > 0) {
          // Scroll Down (Next)
          if (stage === 'intro') triggerTransition('tagline', 1);
          if (stage === 'tagline') triggerTransition('landing', 1);
        } else {
          // Scroll Up (Prev) - Check content first
          if (activeMenuSection) {
            const container = menuContentRef.current;
            const isAtTop = !container || container.scrollTop <= 5;

            if (isAtTop && atTopReadyToCloseRef.current) {
              // Second scroll at top - close the section
              window.history.back();
              atTopReadyToCloseRef.current = false;
              // Long cooldown to prevent skipping multiple pages
              isTransitioningRef.current = true;
              setTimeout(() => { isTransitioningRef.current = false; }, 800);
            } else if (isAtTop) {
              // First scroll at top - set ready to close with delay
              atTopReadyToCloseRef.current = true;
              // Add cooldown to prevent immediate second scroll
              isTransitioningRef.current = true;
              setTimeout(() => { isTransitioningRef.current = false; }, 600);
            } else {
              // Not at top - allow normal scroll but track position
              atTopReadyToCloseRef.current = false;
            }
          } else {
            if (stage === 'tagline') triggerTransition('intro', -1);
            // Disabled reverse transition from landing to avoid aggressive scroll-jacking
            // if (stage === 'landing') triggerTransition('tagline', -1);
          }
        }
      }
    };

    const handleEdgeSwipe = () => {
      if (stage === 'landing') {
        if (activeMenuSection) {
          // If viewing a menu section, close it to reveal the menu
          setActiveMenuSection(null);
        } else if (!isMenuOpen) {
          // If menu is closed, open it
          setIsMenuOpen(true);
        }
      }
    };

    const handleSwipeBack = () => {
      const hasOverlay = isMenuOpen || activeMenuSection || webviewUrl;
      if (hasOverlay) {
        window.history.back();
      } else if (stage !== 'landing') {
        // Navigate stages backwards only if NOT on landing stage
        // On landing stage, edge-swipe is reserved for menu toggle
        if (stage === 'tagline') triggerTransition('intro', -1);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('edge-swipe-right', handleEdgeSwipe);
    window.addEventListener('swipe-back', handleSwipeBack);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('edge-swipe-right', handleEdgeSwipe);
      window.removeEventListener('swipe-back', handleSwipeBack);
    };
  }, [stage, activeMenuSection, isMenuOpen, webviewUrl]);

  // Handle Browser Back Button (History API)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // If we are popping state, we are consuming the history entry
      overlayHistoryEntryRef.current = false;

      if (webviewUrl) {
        setWebviewUrl(null);
      } else if (isMenuOpen) {
        setIsMenuOpen(false);
      } else if (activeMenuSection) {
        if (activeJournalArticle) {
          setActiveJournalArticle(null);
          // Re-push state because we are still in sub-menu (Journal List)
          // Wait, simpler: if we want Journal Article -> Journal List -> Main Menu
          // We need 2 history entries?
          // "Active Journal Article" is inside "Active Menu Section".
          // If we want back button to go Article -> List, we need to push state when Article opens.
          // But let's keep it simple: Back closes the Overlay completely OR steps back?
          // Current code in handlePopState closed everything one by one.
          // If activeJournalArticle is set, we null it.
          // But we already popped the history entry!
          // So if we had 1 entry for "Overlay", and we pop it... we are back to base.
          // So we must close ALL overlays?
          // OR we ensure we have 1 entry per level.
          // Let's stick to "One Big Overlay" mode for now to fix the specific bug, 
          // OR handle re-pushing.
          // User constraint: "goes back" (navigates away).
          // Safer: Close top level. If there are more levels, we need to RE-INSERT the history entry?
          // That's risky.
          // Let's assume 1 level of overlay for now (Menu). Sub-menu is inside Menu. 
          // If user goes Menu -> Submenu, it is still "Overlay".
          // If they click back, they want Submenu -> Menu.
          // If we mistakenly close EVERYTHING, that's annoying but better than leaving the site.
          // Current existing logic:
          // if (webviewUrl) close webview
          // else if (activeMenuSection) close section
          // else if (isMenuOpen) close menu

          // This implies: Back Button goes 1 step back in UI.
          // But if we only pushed 1 History Entry... popping it leaves us with 0.
          // So if we still have UI open (activeMenuSection -> null, but isMenuOpen -> true),
          // We are in trouble (Back button again will leave site).

          // Fix: We need to RE-PUSH if we are still in an overlay state.
          // BUT re-pushing in popstate is tricky.

          // Alternative: Push state EVERY TIME we go deeper.
          // Menu Open -> Push. History: [Base, Menu]
          // Menu Section Open -> Push. History: [Base, Menu, Section]
          // Back -> Pop. History: [Base, Menu]. UI: Close Section.

          // This is robust.
        } else {
          setActiveMenuSection(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMenuOpen, activeMenuSection, webviewUrl, activeJournalArticle]);

  // Synchronize state changes with History API
  useEffect(() => {
    // If we have an active overlay (Menu, Section, or Webview)
    const hasOverlay = isMenuOpen || !!activeMenuSection || !!webviewUrl;

    // Logic:
    // 1. If overlay is active AND we don't have a history entry, push one.
    // 2. If overlay is NOT active AND we have a history entry, pop it? (No, usually we rely on back button)

    if (hasOverlay && !overlayHistoryEntryRef.current) {
      // Create a history entry for the overlay state
      window.history.pushState({ overlay: true }, '');
      overlayHistoryEntryRef.current = true;
    }
    // IMPORTANT: If we are in handlePopState (popped), overlayHistoryEntryRef becomes false.
    // But if we still have an overlay open (e.g. Menu popped but Section still open), 
    // THIS EFFECT will run again because 'isMenuOpen' changed.
    // It sees 'hasOverlay' is still true (due to activeMenuSection), and 'overlayHistoryEntryRef' is false.
    // So it will RE-PUSH the state.
    // This effectively restores the history entry for the remaining overlay layer.

  }, [isMenuOpen, activeMenuSection, webviewUrl, activeJournalArticle]);

  const triggerTransition = (newStage: Stage, newDirection: number) => {
    isTransitioningRef.current = true;
    setDirection(newDirection);

    // Close menu if transitioning away from landing
    if (newStage !== 'landing') {
      setIsMenuOpen(false);
    }

    if (newStage === 'intro') {
      setRippleActive(true);
    } else {
      setRippleActive(false);
    }

    setStage(newStage);

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, DURATION * 1000);
  };

  // VARIANTS
  const maskDots = 'radial-gradient(circle, black 2px, transparent 2.5px)';
  const maskSolid = 'radial-gradient(circle, black 10px, transparent 10.5px)';
  const maskSize = '6px 6px';

  // Intro Variants
  const introVariants: Variants = {
    initial: (dir: number) => ({
      opacity: 0,
      maskImage: maskSolid,
      ...({ WebkitMaskImage: maskSolid } as any),
      maskSize: maskSize, WebkitMaskSize: maskSize,
      scale: dir > 0 ? 0.3 : 0.2 // Simplified logic: Next=0.3 (start small), Prev=0.2 (start small)
    }),
    animate: {
      scale: 1,
      opacity: 1,
      maskImage: maskSolid,
      ...({ WebkitMaskImage: maskSolid } as any),
      maskSize: maskSize, WebkitMaskSize: maskSize,
      transition: { duration: DURATION, ease: [0.16, 1, 0.3, 1] }
    },
    exit: (dir: number) => ({
      scale: dir > 0 ? 0.2 : 0.3,
      opacity: 0,
      maskImage: maskDots, WebkitMaskImage: maskDots,
      maskSize: maskSize, WebkitMaskSize: maskSize,
      transition: { duration: DURATION, ease: [0.16, 1, 0.3, 1] }
    })
  };

  // Tagline Variants
  const taglineVariants: Variants = {
    initial: (dir: number) => ({
      scale: dir > 0 ? 20 : 0,
      opacity: 0,
      maskImage: dir > 0 ? maskDots : maskSolid,
      ...({ WebkitMaskImage: dir > 0 ? maskDots : maskSolid } as any),
      maskSize: maskSize, WebkitMaskSize: maskSize
    }),
    animate: {
      scale: 1, opacity: 1,
      maskImage: maskSolid,
      ...({ WebkitMaskImage: maskSolid } as any),
      maskSize: maskSize, WebkitMaskSize: maskSize,
      transition: { duration: DURATION, ease: [0.16, 1, 0.3, 1] }
    },
    exit: (dir: number) => ({
      scale: dir > 0 ? 0 : 20,
      opacity: 0,
      maskImage: maskSolid,
      WebkitMaskImage: maskSolid,
      maskSize: maskSize,
      WebkitMaskSize: maskSize,
      transition: { duration: DURATION, ease: [0.16, 1, 0.3, 1] }
    })
  };

  // UI Variants
  const menuVariants: Variants = {
    initial: (dir: number) => ({
      x: dir > 0 ? '-100vw' : '-100vw',
      opacity: 1
    }),
    animate: {
      x: 0, opacity: 1,
      transition: { duration: DURATION, ease: [0.16, 1, 0.3, 1] }
    },
    exit: (dir: number) => ({
      x: '-100vw',
      opacity: 1,
      transition: { duration: dir < 0 ? 2.0 : DURATION, ease: [0.16, 1, 0.3, 1] }
    })
  };

  const contactTextVariants: Variants = {
    initial: (dir: number) => ({
      x: '100vw',
      opacity: 1
    }),
    animate: {
      x: 0, opacity: 1,
      transition: { duration: DURATION, ease: [0.16, 1, 0.3, 1] }
    },
    exit: (dir: number) => ({
      x: '100vw',
      opacity: 1,
      transition: { duration: dir < 0 ? 2.0 : DURATION, ease: [0.16, 1, 0.3, 1] }
    })
  };

  // Left Menu Overlay Variants
  const menuOverlayVariants: Variants = {
    initial: { x: '-100%' },
    animate: {
      x: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    },
    exit: {
      x: '-100%',
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <WaterEffect isActive={rippleActive} onSwipe={() => { }} />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
          pointerEvents: 'none',
          width: '100%',
          height: '100%',
        }}
      >
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          {stage === 'intro' && (
            <motion.h1
              key="intro"
              custom={direction}
              variants={introVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{
                fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: 'clamp(2.5rem, 10vw, 6rem)',
                fontWeight: 100,
                color: '#000000',
                letterSpacing: '-0.02em',
                userSelect: 'none',
                margin: 0,
                whiteSpace: 'nowrap',
                position: 'absolute',
                maskRepeat: 'repeat',
                WebkitMaskRepeat: 'repeat',
              }}
            >
              KiWA Labs
            </motion.h1>
          )}

          {/* ParticleText - Hide when menu section is active */}
          {!activeMenuSection && (
            <ParticleText
              text="KiWA Labs"
              className="particle-text"
              stage={stage}
            />
          )}

          {stage === 'tagline' && (
            <motion.h2
              key="tagline"
              custom={direction}
              variants={taglineVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{
                fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: isDesktop ? 'clamp(1.5rem, 6vw, 4rem)' : 'clamp(1.6rem, 7.5vw, 4rem)', // Slightly smaller on mobile
                fontWeight: isDesktop ? 100 : 500, // Reduced weight on mobile
                color: '#000000',
                letterSpacing: '-0.02em',
                userSelect: 'none',
                margin: 0,
                padding: '0 20px',
                whiteSpace: 'nowrap',
                position: 'absolute',
                maskRepeat: 'repeat',
                WebkitMaskRepeat: 'repeat',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <span>Anything you can imagine,</span>
              <span style={{ alignSelf: 'flex-end' }}>we can build!</span>
            </motion.h2>
          )}
        </AnimatePresence>
      </div>

      {/* LANDING STAGE UI */}
      <AnimatePresence custom={direction}>
        {stage === 'landing' && (
          /* Menu Button (Top Left) */
          <motion.div
            key="menu-btn"
            custom={direction}
            variants={menuVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              position: 'fixed',
              top: '40px',
              left: '30px',
              zIndex: 10,
              filter: 'grayscale(100%)',
              cursor: 'pointer', // Add pointer cursor
            }}
            onClick={() => setIsMenuOpen(true)} // Open Menu Action
          >
            <div style={{ position: 'relative', width: '30px', height: '30px' }}>
              <Image
                src="/click-to-open-menu-icon.png"
                alt="Menu"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </motion.div>
        )}

        {stage === 'landing' && (
          /* Contact Text (Top Right) */
          <motion.div
            key="contact-text"
            custom={direction}
            variants={contactTextVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              position: 'fixed',
              top: '40px',
              right: '30px',
              zIndex: 10,
            }}
          >
            <span
              onClick={() => setActiveMenuSection('contact-us')}
              style={{
                fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: '1.2rem',
                fontWeight: 500,
                color: '#000000',
                letterSpacing: '-0.01em',
                cursor: 'pointer'
              }}>Contact Us</span>
          </motion.div>
        )}

        {/* BRAUN GRID NAVIGATION - Hide when menu section is active */}
        {stage === 'landing' && !activeMenuSection && (
          <motion.div
            key="landing-nav"
            style={{
              position: 'absolute',
              bottom: '80px', // Positioned at bottom
              left: '5vw',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '20px',
              zIndex: 10,
            }}
          >
            {[
              { id: '01', label: 'Capabilities' },
              { id: '02', label: 'Selected Works' },
              { id: '03', label: 'View More' }
            ].map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ y: 100, opacity: 0 }} // Animate from bottom
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }} // Retract to bottom
                transition={{
                  duration: 1.0,
                  delay: index * 0.1, // Stagger effect
                  ease: [0.16, 1, 0.3, 1]
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                variants={{
                  hover: { x: 10, color: '#333333' }
                }}
                whileHover="hover"
                onClick={() => {
                  if (item.label === 'View More') {
                    setIsMenuOpen(true);
                  } else {
                    const sectionId = item.label.toLowerCase().replace(/ /g, '-');
                    setActiveMenuSection(sectionId);
                  }
                }}
              >
                {/* Hover Dot - Braun Orange (Now Dark Grey) */}
                <motion.div
                  variants={{
                    hover: { opacity: 1, scale: 1 },
                    initial: { opacity: 0, scale: 0 }
                  }}
                  initial="initial"
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#333333',
                    marginRight: '16px',
                  }}
                />
                <span style={{
                  fontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
                  fontSize: 'clamp(1.2rem, 3vw, 2rem)', // Slightly bigger
                  fontWeight: 400,
                  color: 'inherit', // Inherit from motion.div
                  letterSpacing: '-0.02em',
                }}>
                  <span style={{ opacity: 0.4, marginRight: '10px' }}>{item.id}</span>
                  {item.label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MENU CONTENT SECTION */}
      <AnimatePresence>
        {stage === 'landing' && activeMenuSection && (
          <motion.div
            ref={menuContentRef}
            key="menu-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingTop: '120px',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingBottom: '150px', // Extra padding for footer
              zIndex: 5,
              overflowY: 'auto',
            }}
          >
            {/* X Close Button - Top Center */}
            <motion.div
              style={{
                position: 'absolute',
                top: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                cursor: 'pointer',
                fontFamily: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
                fontSize: '1.5rem',
                fontWeight: 300,
                color: '#000000',
                opacity: 0.6,
              }}
              whileHover={{ opacity: 1 }}
              onClick={() => window.history.back()}
            >
              ✕
            </motion.div>

            {/* Content */}
            <div style={{
              maxWidth: (isDesktop && (activeMenuSection === 'selected-works' || activeMenuSection === 'pricing')) ? 'none' : '600px',
              width: '100%',
              textAlign: (isDesktop && (activeMenuSection === 'selected-works' || activeMenuSection === 'pricing')) ? 'left' : 'center',
              fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', sans-serif",
            }}>
              {activeMenuSection === 'why-choose-us' && (
                <div style={{ paddingBottom: '100px', maxWidth: '800px' }}>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    style={{
                      fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                      fontWeight: 300,
                      marginBottom: '10px',
                      letterSpacing: '-0.02em',
                      textAlign: 'center'
                    }}
                  >
                    Why Choose Us
                  </motion.h2>
                  <p style={{
                    fontSize: '1.1rem',
                    color: '#666',
                    textAlign: 'center',
                    marginBottom: '60px',
                    fontWeight: 400
                  }}>
                    Carefully built. Securely delivered. Designed to last.
                  </p>

                  <div style={{ marginBottom: '80px' }}>
                    <Image
                      src="/setup2.0.jpg"
                      alt="Foresight"
                      width={800}
                      height={500}
                      style={{ width: '100%', height: 'auto', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                    />
                    <p style={{ fontSize: '1.25rem', lineHeight: 1.8, color: '#222', textAlign: 'center' }}>
                      Choosing a digital partner isn’t just about who can build the fastest.<br />
                      It’s about who builds with foresight.
                    </p>
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center', marginTop: '20px' }}>
                      At KiWA Labs, we design and develop platforms with longevity in mind — secure, scalable, and thoughtfully crafted from the very first line of code.
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', opacity: 0.2, fontSize: '1.5rem', margin: '60px 0' }}>⸻</div>

                  <div style={{ marginBottom: '80px' }}>
                    <h3 style={{ fontSize: '2rem', fontWeight: 300, marginBottom: '30px', textAlign: 'center' }}>Security Is Foundational</h3>
                    <Image
                      src="/foundation built on trust.JPG"
                      alt="Security"
                      width={800}
                      height={450}
                      style={{ width: '100%', height: 'auto', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                    />
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center' }}>
                      We prioritize security at every layer.
                    </p>
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center', marginTop: '20px' }}>
                      Our commitment to cybersecurity isn’t a feature added at the end of a project — it’s built into the architecture from the start. From infrastructure decisions to deployment practices, we design systems that protect both businesses and the people who use them.
                    </p>
                    <p style={{ fontSize: '1.2rem', fontWeight: 500, color: '#000', textAlign: 'center', marginTop: '20px' }}>
                      In a world where trust is fragile, we build platforms that earn it.
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', opacity: 0.2, fontSize: '1.5rem', margin: '60px 0' }}>⸻</div>

                  <div style={{ marginBottom: '80px' }}>
                    <h3 style={{ fontSize: '2rem', fontWeight: 300, marginBottom: '30px', textAlign: 'center' }}>Built to Last</h3>
                    <Image
                      src="/innovation that actually matters.PNG"
                      alt="Built to Last"
                      width={800}
                      height={450}
                      style={{ width: '100%', height: 'auto', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                    />
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center' }}>
                      We believe in innovation that matters.
                    </p>
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center', marginTop: '20px' }}>
                      Trends move quickly. Good systems shouldn’t.
                      Every platform we build is designed to stand the test of time — scalable, maintainable, and adaptable as your business grows.
                    </p>
                    <p style={{ fontSize: '1.25rem', color: '#000', textAlign: 'center', marginTop: '20px' }}>
                      We don’t just deliver launches.<br />
                      We deliver foundations.
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', opacity: 0.2, fontSize: '1.5rem', margin: '60px 0' }}>⸻</div>

                  <div style={{ marginBottom: '80px' }}>
                    <h3 style={{ fontSize: '2rem', fontWeight: 300, marginBottom: '30px', textAlign: 'center' }}>Patience Is Our Practice</h3>
                    <Image
                      src="/patience is a competitive advantage.PNG"
                      alt="Patience"
                      width={800}
                      height={450}
                      style={{ width: '100%', height: 'auto', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                    />
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center' }}>
                      Great work takes attention.
                    </p>
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center', marginTop: '20px' }}>
                      We listen carefully. We ask the right questions. We take time to understand the nuance behind what you’re building. Because excellence rarely comes from rushing — it comes from precision.
                    </p>
                    <p style={{ fontSize: '1.25rem', color: '#000', textAlign: 'center', marginTop: '20px' }}>
                      Details matter.<br />
                      And we don’t overlook them.
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', opacity: 0.2, fontSize: '1.5rem', margin: '60px 0' }}>⸻</div>

                  <div style={{ marginBottom: '80px' }}>
                    <h3 style={{ fontSize: '2rem', fontWeight: 300, marginBottom: '30px', textAlign: 'center' }}>We Think in Systems, Not Pages</h3>
                    <Image
                      src="/Building Platforms, Not Just Websites.JPG"
                      alt="Systems Thinking"
                      width={800}
                      height={450}
                      style={{ width: '100%', height: 'auto', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                    />
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center', marginBottom: '30px' }}>
                      Whether you’re building a startup product, internal tool, or full digital ecosystem, we approach every project as a system — not just a website.
                    </p>
                    <ul style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      fontSize: '1.1rem',
                      lineHeight: 2,
                      color: '#222',
                      textAlign: 'center'
                    }}>
                      <li>• Thoughtful architecture</li>
                      <li>• Clean, scalable code</li>
                      <li>• Flexible design systems</li>
                      <li>• Future-ready infrastructure</li>
                    </ul>
                    <p style={{ fontSize: '1.25rem', fontWeight: 500, color: '#000', textAlign: 'center', marginTop: '30px' }}>
                      So what we build today still works tomorrow.
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', opacity: 0.2, fontSize: '1.5rem', margin: '60px 0' }}>⸻</div>

                  <div style={{ marginBottom: '80px' }}>
                    <h3 style={{ fontSize: '2rem', fontWeight: 300, marginBottom: '30px', textAlign: 'center' }}>Clear Communication, Calm Process</h3>
                    <Image
                      src="/collaborative-calm-workflow.png"
                      alt="Collaborative Workflow"
                      width={800}
                      height={450}
                      style={{ width: '100%', height: 'auto', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                    />
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center' }}>
                      Good projects come from clarity.
                    </p>
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center', marginTop: '20px' }}>
                      We keep communication direct, timelines realistic, and expectations transparent. No chaos. No disappearing. No unnecessary complexity.
                    </p>
                    <p style={{ fontSize: '1.25rem', color: '#000', textAlign: 'center', marginTop: '20px' }}>
                      Just a steady, focused process from start to finish.
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', opacity: 0.2, fontSize: '1.5rem', margin: '60px 0' }}>⸻</div>

                  <div style={{ marginBottom: '80px' }}>
                    <h3 style={{ fontSize: '2rem', fontWeight: 300, marginBottom: '30px', textAlign: 'center' }}>Long-Term Partnership Thinking</h3>
                    <Image
                      src="/handshake.png"
                      alt="Partnership"
                      width={800}
                      height={450}
                      style={{ width: '100%', height: 'auto', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                    />
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center', marginTop: '20px' }}>
                      We don’t build and disappear.
                    </p>
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center', marginTop: '20px' }}>
                      We think in years, not launches — designing platforms that grow with you and remain relevant long after version one goes live. Many of our best relationships are ongoing, evolving as our clients evolve.
                    </p>
                    <p style={{ fontSize: '1.25rem', color: '#000', textAlign: 'center', marginTop: '20px' }}>
                      We’re here for the long run.
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', opacity: 0.2, fontSize: '1.5rem', margin: '60px 0' }}>⸻</div>

                  <div style={{ marginBottom: '80px' }}>
                    <h3 style={{ fontSize: '2rem', fontWeight: 300, marginBottom: '30px', textAlign: 'center' }}>Technology With Impact</h3>
                    <Image
                      src="/Technology with responsibility.JPG"
                      alt="Impact"
                      width={800}
                      height={450}
                      style={{ width: '100%', height: 'auto', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                    />
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center', marginTop: '20px' }}>
                      Our work doesn’t stop at delivery.
                    </p>
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center', marginTop: '20px' }}>
                      For every project completed with KiWA Labs, a tree is planted. It’s a small but meaningful way we contribute to a more sustainable future while building digital infrastructure in the present.
                    </p>
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center', marginTop: '20px' }}>
                      We also dedicate time and resources toward philanthropic efforts and initiatives that support communities and responsible innovation.
                    </p>
                    <p style={{ fontSize: '1.25rem', color: '#000', textAlign: 'center', marginTop: '20px' }}>
                      Growth should benefit more than just business.<br />
                      It should benefit the world around it.
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', opacity: 0.2, fontSize: '1.5rem', margin: '60px 0' }}>⸻</div>

                  <div style={{ marginBottom: '80px' }}>
                    <h3 style={{ fontSize: '2rem', fontWeight: 300, marginBottom: '30px', textAlign: 'center' }}>A Thoughtful Choice</h3>
                    <Image
                      src="/looking ahead.PNG"
                      alt="Thoughtful Choice"
                      width={800}
                      height={450}
                      style={{ width: '100%', height: 'auto', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                    />
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center', marginBottom: '20px' }}>
                      If you’re looking for the fastest, cheapest, or most rushed solution, we may not be the right fit.
                    </p>
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center', marginBottom: '30px' }}>
                      But if you’re looking for a team that values:
                    </p>
                    <ul style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      fontSize: '1.1rem',
                      lineHeight: 2,
                      color: '#222',
                      textAlign: 'center'
                    }}>
                      <li>• Security</li>
                      <li>• Longevity</li>
                      <li>• Precision</li>
                      <li>• Clarity</li>
                      <li>• Partnership</li>
                    </ul>
                    <p style={{ fontSize: '1.25rem', color: '#000', textAlign: 'center', marginTop: '40px' }}>
                      Then we’re aligned.
                    </p>
                    <p style={{ fontSize: '1.2rem', fontWeight: 500, color: '#000', textAlign: 'center', marginTop: '20px' }}>
                      We build carefully. We build securely. We build things that last.
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', opacity: 0.2, fontSize: '1.5rem', margin: '60px 0' }}>⸻</div>

                  <p style={{ fontSize: '0.9rem', color: '#888', textAlign: 'center', fontStyle: 'italic' }}>
                    Every project plants a tree. Every partnership supports something beyond the screen.
                  </p>
                </div>
              )}

              {activeMenuSection === 'vision-2030' && (
                <div style={{ paddingBottom: '100px', maxWidth: '800px' }}>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    style={{
                      fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                      fontWeight: 300,
                      marginBottom: '60px',
                      letterSpacing: '-0.02em',
                      textAlign: 'center'
                    }}
                  >
                    Vision 2030
                  </motion.h2>

                  {/* Vision Sections Data */}
                  {[
                    {
                      title: "Building Digital Infrastructure That Endures",
                      text: "By 2030, the internet will be louder, faster, and more crowded than ever. More platforms. More automation. More noise. At KiWA Labs, our vision is to move in the opposite direction. We are building toward a future where digital products are not just launched quickly, but designed to last — secure by default, thoughtful by design, and resilient in a constantly changing world. Vision 2030 is our commitment to that future.",
                      image: "/vision 2030.JPG"
                    },
                    {
                      title: "A Foundation Built on Trust",
                      text: "By 2030, trust will be the most valuable currency on the internet. Our vision is to make security non-negotiable, not an afterthought or an upsell. Every platform we build is designed with protection woven into its foundation — from architecture decisions to deployment practices. We don’t chase shortcuts. We design systems that can be trusted by businesses, users, and communities over time. Security is not a feature. It is the ground we stand on.",
                      image: "/foundation built on trust.JPG"
                    },
                    {
                      title: "Innovation That Actually Matters",
                      text: "Technology should solve real problems — not create new ones. By 2030, KiWA Labs aims to be known for intentional innovation: building platforms that are useful, adaptable, and relevant long after trends fade. We don’t build for hype cycles. We build for longevity. Our work prioritizes clarity over complexity, function over flash, and purpose over performance theatre. Innovation, for us, means choosing what not to build as much as what to build.",
                      image: "/innovation that actually matters.PNG"
                    },
                    {
                      title: "Patience as a Competitive Advantage",
                      text: "The fastest solution is rarely the best one. Our vision is to preserve something rare in modern tech: patience. By 2030, KiWA Labs will continue to practice deep listening, careful planning, and obsessive attention to detail — because excellence lives in the nuances most people rush past. We believe good design requires time, strong systems require foresight, and great outcomes require restraint. Patience is not hesitation. It is precision.",
                      image: "/patience is a competitive advantage.PNG"
                    },
                    {
                      title: "Building Platforms, Not Just Websites",
                      text: "KiWA Labs is not just a design or development agency. Our vision is to build digital platforms — systems that scale, evolve, and adapt as our clients grow. Whether it’s a startup, an enterprise tool, or a custom digital ecosystem, we focus on architecture that supports the future, not just the present. By 2030, we aim to be the silent infrastructure behind products people rely on every day — even if they never see our name.",
                      image: "/Building Platforms, Not Just Websites.JPG"
                    },
                    {
                      title: "Technology With Responsibility",
                      text: "Progress should not come at the cost of responsibility. Our Vision 2030 includes a commitment to giving back — through philanthropy, environmental initiatives, and conscious business practices. Growth means nothing if it doesn’t leave the world better than we found it. We believe technology should empower people, protect communities, and respect the planet. Impact is not optional. It is part of the work.",
                      image: "/Technology with responsibility.JPG"
                    },
                    {
                      title: "Looking Ahead",
                      text: "Vision 2030 is not a finish line. It’s a direction. As tools evolve and challenges change, our principles remain the same: Build securely, Design thoughtfully, Move deliberately, Create things that endure. KiWA Labs exists to build the kind of digital future we would want to use ourselves. That is our vision. And we are just getting started.",
                      image: "/looking ahead.PNG"
                    }
                  ].map((section, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      style={{ marginBottom: '140px' }}
                    >
                      <h3 style={{
                        fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
                        fontWeight: 300,
                        marginBottom: '30px',
                        color: '#000'
                      }}>
                        {section.title}
                      </h3>

                      {section.image && (
                        <img
                          src={section.image}
                          alt={section.title}
                          style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '12px',
                            marginBottom: '40px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                          }}
                        />
                      )}

                      <p style={{
                        fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)',
                        lineHeight: 1.8,
                        color: '#444',
                        fontWeight: 400
                      }}>
                        {section.text}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Capabilities Section with Cards */}
              {activeMenuSection === 'capabilities' && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  maxWidth: '800px',
                  width: '100%',
                }}>
                  <motion.h2
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                      fontWeight: 400,
                      marginBottom: '30px',
                      letterSpacing: '-0.02em',
                      textAlign: 'left',
                    }}
                  >
                    Capabilities
                  </motion.h2>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '30px',
                    justifyContent: 'flex-start',
                    width: '100%',
                  }}>
                    {/* Development Services Card */}
                    <motion.div
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        flex: '1 1 300px',
                        padding: '30px',
                        backgroundColor: '#fafafa',
                        borderRadius: '12px',
                        textAlign: 'left',
                      }}
                    >
                      <h3 style={{
                        fontSize: '1.3rem',
                        fontWeight: 500,
                        marginBottom: '20px',
                        color: '#000000'
                      }}>
                        Development Services
                      </h3>
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        fontSize: '1.1rem',
                        lineHeight: 2,
                        color: '#333333',
                        fontWeight: 400,
                      }}>
                        <li>• Android & iOS Apps</li>
                        <li>• Web Applications (Any Framework)</li>
                        <li>• Chrome Extensions</li>
                        <li>• Desktop Software</li>
                        <li>• API Development</li>
                      </ul>
                    </motion.div>

                    {/* AI Ecosystems Card */}
                    <motion.div
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        flex: '1 1 300px',
                        padding: '30px',
                        backgroundColor: '#fafafa',
                        borderRadius: '12px',
                        textAlign: 'left',
                      }}
                    >
                      <h3 style={{
                        fontSize: '1.3rem',
                        fontWeight: 500,
                        marginBottom: '20px',
                        color: '#000000'
                      }}>
                        AI Ecosystems
                      </h3>
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        fontSize: '1.1rem',
                        lineHeight: 2,
                        color: '#333333',
                        fontWeight: 400,
                      }}>
                        <li>• Custom AI Agent Development</li>
                        <li>• Autonomous Workflow Automation</li>
                        <li>• Secure AI Safety Protocols</li>
                        <li>• Private & Offline AI Deployment</li>
                        <li>• Neural Interface Research</li>
                      </ul>
                    </motion.div>

                    {/* Startup Support Card */}
                    <motion.div
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        flex: '1 1 300px',
                        padding: '30px',
                        backgroundColor: '#fafafa',
                        borderRadius: '12px',
                        textAlign: 'left',
                      }}
                    >
                      <h3 style={{
                        fontSize: '1.3rem',
                        fontWeight: 500,
                        marginBottom: '20px',
                        color: '#000000'
                      }}>
                        Startup Support
                      </h3>
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        fontSize: '1.1rem',
                        lineHeight: 2,
                        color: '#333333',
                        fontWeight: 400,
                      }}>
                        <li>• LLC & Business Registration</li>
                        <li>• Domain & Email Setup</li>
                        <li>• MVP Build</li>
                        <li>• Technical Consulting</li>
                      </ul>
                    </motion.div>
                  </div>
                </div>
              )}

              {/* Selected Works Section */}
              {activeMenuSection === 'selected-works' && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  maxWidth: '1000px',
                  width: '100%',
                }}>
                  <motion.h2
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                      fontWeight: 400,
                      marginBottom: '40px',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Selected Works
                  </motion.h2>

                  {/* Projects Grid - 2 columns on desktop, 1 on mobile */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isDesktop ? 'repeat(2, 1fr)' : '1fr',
                    gap: '30px',
                    width: '100%',
                    maxWidth: isDesktop ? '800px' : '100%',
                    justifyItems: isDesktop ? 'stretch' : 'center',
                    alignItems: 'stretch',
                  }}>
                    {/* Klassic Bubu Card */}
                    <motion.div
                      initial={{ y: 60, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                        maxWidth: isDesktop ? 'none' : '280px',
                        width: '100%',
                      }}
                      onClick={() => window.open('https://www.klassikbubu.ng', '_blank')}
                      whileHover={{
                        scale: 1.02,
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)',
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        backgroundColor: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        <img
                          src="/klassic-bubu-new.png"
                          alt="Klassic Bubu - Fashion E-commerce"
                          style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                          }}
                        />
                      </div>
                      <div style={{ padding: '24px' }}>
                        <h3 style={{
                          fontSize: '1.3rem',
                          fontWeight: 600,
                          marginBottom: '8px',
                          color: '#1a1a1a',
                        }}>
                          Klassic Bubu
                        </h3>
                        <p style={{
                          fontSize: '1rem',
                          color: '#555',
                          marginBottom: '12px',
                          lineHeight: 1.5,
                        }}>
                          Fashion E-commerce Platform
                        </p>
                        <span style={{
                          fontSize: '0.9rem',
                          color: '#0066cc',
                          fontWeight: 500,
                        }}>
                          klassikbubu.ng →
                        </span>
                      </div>
                    </motion.div>

                    {/* KiWA Flow Card */}
                    <motion.div
                      initial={{ y: 60, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                        maxWidth: isDesktop ? 'none' : '280px',
                        width: '100%',
                      }}
                      onClick={() => setWebviewUrl('https://ki-waflow.vercel.app')}
                      whileHover={{
                        scale: 1.02,
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)',
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        backgroundColor: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}>
                        <img
                          src="/kiwa-flow.png"
                          alt="KiWA Flow - Website Builder"
                          style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                          }}
                        />
                      </div>
                      <div style={{ padding: '24px' }}>
                        <h3 style={{
                          fontSize: '1.3rem',
                          fontWeight: 600,
                          marginBottom: '8px',
                          color: '#1a1a1a',
                        }}>
                          KiWA Flow
                        </h3>
                        <p style={{
                          fontSize: '1rem',
                          color: '#555',
                          marginBottom: '12px',
                          lineHeight: 1.5,
                        }}>
                          Intuitive Website Builder
                        </p>
                        <span style={{
                          fontSize: '0.9rem',
                          color: '#0066cc',
                          fontWeight: 500,
                        }}>
                          View Demo →
                        </span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              {/* Pricing Section */}
              {activeMenuSection === 'pricing' && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  maxWidth: isDesktop ? '1000px' : '700px',
                  width: '100%',
                }}>
                  <motion.h2
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                      fontWeight: 400,
                      marginBottom: '30px',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Pricing
                  </motion.h2>

                  <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    style={{ width: '100%' }}
                  >
                    {isDesktop ? (
                      <ExcelPricing />
                    ) : (
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.95rem',
                      }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #eee' }}>
                            <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 500 }}>Website Type</th>
                            <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 500 }}>KiWA Labs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { type: 'Small Personal / Info Website', price: '₦55,000 – ₦130,000' },
                            { type: 'Clean Modern Website (Design Only)', price: '₦100,000 – ₦280,000' },
                            { type: 'Business Website (Contact, Forms, Admin)', price: '₦180,000 – ₦580,000' },
                            { type: 'Custom Website with Login & Features', price: '₦280,000 – ₦1,480,000' },
                            { type: 'Online Store (Sell Products)', price: '₦280,000 – ₦730,000' },
                            { type: 'Booking Website (Appointments / Rentals)', price: '₦280,000 – ₦680,000' },
                            { type: 'Admin Dashboard / Staff System', price: '₦230,000 – ₦580,000' },
                            { type: 'Delivery / Dispatch Website (Tracking)', price: '₦380,000 – ₦1,180,000' },
                          ].map((item, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ padding: '14px 8px', color: '#333' }}>{item.type}</td>
                              <td style={{ padding: '14px 8px', textAlign: 'right', color: '#000', fontWeight: 400 }}>{item.price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </motion.div>
                </div>
              )}

              {/* Journal Section */}
              {activeMenuSection === 'journal' && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  maxWidth: '650px',
                  width: '100%',
                }}>
                  <AnimatePresence mode="wait">
                    {!activeJournalArticle ? (
                      /* Journal List View */
                      <motion.div
                        key="journal-list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ width: '100%' }}
                      >
                        <motion.h2
                          initial={{ x: -50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                          style={{
                            fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                            fontWeight: 400,
                            marginBottom: '40px',
                            letterSpacing: '-0.02em',
                          }}
                        >
                          Journal
                        </motion.h2>

                        {/* Clickable Article Titles */}
                        <motion.div
                          initial={{ y: 40, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                          style={{
                            padding: '24px',
                            backgroundColor: '#fafafa',
                            borderRadius: '12px',
                            marginBottom: '16px',
                            cursor: 'pointer',
                          }}
                          whileHover={{ x: 8, backgroundColor: '#f0f0f0' }}
                          onClick={() => setActiveJournalArticle('dieter-rams')}
                        >
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: '8px' }}>
                            Dieter Rams: 10 Rules for Good Design
                          </h3>
                          <span style={{ fontSize: '0.95rem', color: '#666' }}>Read →</span>
                        </motion.div>

                        <motion.div
                          initial={{ y: 40, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                          style={{
                            padding: '24px',
                            backgroundColor: '#fafafa',
                            borderRadius: '12px',
                            cursor: 'pointer',
                          }}
                          whileHover={{ x: 8, backgroundColor: '#f0f0f0' }}
                          onClick={() => setActiveJournalArticle('kiwa-philosophy')}
                        >
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 500, marginBottom: '8px' }}>
                            The KiWA Philosophy
                          </h3>
                          <span style={{ fontSize: '0.95rem', color: '#666' }}>Read →</span>
                        </motion.div>
                      </motion.div>
                    ) : (
                      /* Article Content View */
                      <motion.div
                        key="journal-article"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        style={{ width: '100%' }}
                      >
                        {/* Back Button */}
                        <motion.div
                          style={{
                            cursor: 'pointer',
                            marginBottom: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '1rem',
                            color: '#666',
                          }}
                          whileHover={{ x: -4, color: '#000' }}
                          onClick={() => setActiveJournalArticle(null)}
                        >
                          ← Back to Journal
                        </motion.div>

                        {/* Dieter Rams Article */}
                        {activeJournalArticle === 'dieter-rams' && (
                          <>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 500, marginBottom: '30px' }}>
                              Dieter Rams: 10 Rules for Good Design
                            </h2>
                            <ol style={{
                              listStyle: 'none',
                              padding: 0,
                              margin: 0,
                              fontSize: '1rem',
                              lineHeight: 1.8,
                              color: '#333',
                            }}>
                              <li style={{ marginBottom: '16px' }}><strong>1. Good design is innovative</strong> — Innovation is always possible and should work in tandem with technology.</li>
                              <li style={{ marginBottom: '16px' }}><strong>2. Good design makes a product useful</strong> — The primary purpose is utility; design should emphasize this.</li>
                              <li style={{ marginBottom: '16px' }}><strong>3. Good design is aesthetic</strong> — The aesthetic quality of a product is integral to its usefulness.</li>
                              <li style={{ marginBottom: '16px' }}><strong>4. Good design makes a product understandable</strong> — It clarifies the product's structure. Ideally, it speaks for itself.</li>
                              <li style={{ marginBottom: '16px' }}><strong>5. Good design is unobtrusive</strong> — Products are tools, not decorative objects or art.</li>
                              <li style={{ marginBottom: '16px' }}><strong>6. Good design is honest</strong> — It does not manipulate the consumer with promises that cannot be kept.</li>
                              <li style={{ marginBottom: '16px' }}><strong>7. Good design is long-lasting</strong> — It avoids being fashionable and therefore never appears antiquated.</li>
                              <li style={{ marginBottom: '16px' }}><strong>8. Good design is thorough</strong> — Nothing must be arbitrary or left to chance.</li>
                              <li style={{ marginBottom: '16px' }}><strong>9. Good design is environmentally-friendly</strong> — It conserves resources and minimizes pollution.</li>
                              <li style={{ marginBottom: '16px' }}><strong>10. Good design is as little design as possible</strong> — Focus on the essential aspects. Back to purity, back to simplicity.</li>
                            </ol>
                          </>
                        )}

                        {/* KiWA Philosophy Article */}
                        {activeJournalArticle === 'kiwa-philosophy' && (
                          <>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 500, marginBottom: '30px' }}>
                              The KiWA Philosophy
                            </h2>
                            <p style={{ fontSize: '1rem', lineHeight: 1.8, color: '#333', marginBottom: '16px' }}>
                              At KiWA Labs, we believe that exceptional digital products emerge from the intersection of restraint
                              and innovation. Every pixel serves a purpose. Every interaction feels natural. Every solution we build
                              is designed to endure.
                            </p>
                            <p style={{ fontSize: '1rem', lineHeight: 1.8, color: '#333' }}>
                              We approach each project with patience—listening carefully, understanding deeply, and crafting
                              solutions that stand the test of time. Because in a world of constant change, lasting quality is
                              the ultimate competitive advantage.
                            </p>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {activeMenuSection === 'our-impact' && (
                <div style={{ paddingBottom: '100px', maxWidth: '800px' }}>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    style={{
                      fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                      fontWeight: 300,
                      marginBottom: '10px',
                      letterSpacing: '-0.02em',
                      textAlign: 'center'
                    }}
                  >
                    Our Impact
                  </motion.h2>
                  <p style={{
                    fontSize: '1.1rem',
                    color: '#666',
                    textAlign: 'center',
                    marginBottom: '60px',
                    fontWeight: 400
                  }}>
                    Purpose beyond the screen.
                  </p>

                  <div style={{ marginBottom: '80px' }}>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 300, marginBottom: '20px', textAlign: 'center' }}>One Tree Planted</h3>
                    <img
                      src="/trees.png"
                      alt="One Tree Planted"
                      style={{ width: '100%', height: 'auto', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                    />
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center' }}>
                      Technology consumes resources, and we believe it should also replenish them. For every project completed with KiWA Labs, we fund the planting of a tree through global reforestation partners.
                    </p>
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center', marginTop: '20px' }}>
                      It’s a simple promise: As we build digital infrastructure for the future, we’re also investing in the physical foundation of our planet. One project, one tree, one step toward a more sustainable ecosystem.
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', opacity: 0.2, fontSize: '1.5rem', margin: '60px 0' }}>⸻</div>

                  <div style={{ marginBottom: '80px' }}>
                    <h3 style={{ fontSize: '1.8rem', fontWeight: 300, marginBottom: '20px', textAlign: 'center' }}>Philanthropy & Support</h3>
                    <img
                      src="/donate.png"
                      alt="Philanthropy"
                      style={{ width: '100%', height: 'auto', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                    />
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center' }}>
                      We believe that growth should benefit more than just business. KiWA Labs dedicates a portion of its resources and technical expertise to supporting non-profits and community-driven initiatives.
                    </p>
                    <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: '#444', textAlign: 'center', marginTop: '20px' }}>
                      From infrastructure support for local charities to volunteering our time for open-source social impact projects, we are committed to using our skills for the common good. We’re here to build things that last—and that includes communities.
                    </p>
                  </div>
                </div>
              )}

              {(activeMenuSection === 'start-a-project' || activeMenuSection === 'contact-us') && (
                <div style={{ paddingBottom: '100px', maxWidth: '800px', width: '100%' }}>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    style={{
                      fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                      fontWeight: 300,
                      marginBottom: '10px',
                      letterSpacing: '-0.02em',
                      textAlign: 'center'
                    }}
                  >
                    {activeMenuSection === 'start-a-project' ? 'Start a Project' : 'Contact Us'}
                  </motion.h2>
                  <p style={{
                    fontSize: '1.1rem',
                    color: '#666',
                    textAlign: 'center',
                    marginBottom: '60px',
                    fontWeight: 400
                  }}>
                    Let’s build something that lasts.
                  </p>

                  <div style={{
                    backgroundColor: '#fafafa',
                    padding: isDesktop ? '60px' : '30px',
                    borderRadius: '24px',
                    textAlign: 'center',
                    border: '1px solid #f0f0f0'
                  }}>
                    <p style={{ fontSize: '1.4rem', color: '#111', marginBottom: '30px', fontWeight: 300 }}>
                      Have an idea or a specific inquiry?
                    </p>
                    <p style={{ fontSize: '1.1rem', color: '#555', lineHeight: 1.8, marginBottom: '40px' }}>
                      We take on a limited number of projects to ensure the highest level of precision and care. Whether you are building from scratch or scaling an existing ecosystem, we’d love to hear from you.
                    </p>

                    <motion.a
                      href="mailto:kiwalabs@gmail.com"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        display: 'inline-block',
                        padding: '18px 40px',
                        backgroundColor: '#000',
                        color: '#fff',
                        borderRadius: '40px',
                        textDecoration: 'none',
                        fontSize: '1.1rem',
                        fontWeight: 500,
                        letterSpacing: '0.02em',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                      }}
                    >
                      Email Us
                    </motion.a>

                    <div style={{ marginTop: '50px', fontSize: '1rem', color: '#888' }}>
                      <p>kiwalabs@gmail.com</p>
                      <p style={{ marginTop: '10px' }}>Lagos, Nigeria — Global Reach.</p>
                    </div>
                  </div>
                </div>
              )}
              {!['why-choose-us', 'vision-2030', 'capabilities', 'selected-works', 'pricing', 'journal', 'our-impact', 'start-a-project', 'contact-us'].includes(activeMenuSection) && (
                <>
                  <h2 style={{
                    fontSize: 'clamp(1.8rem, 5vw, 3rem)',
                    fontWeight: 400,
                    marginBottom: '30px',
                    letterSpacing: '-0.02em',
                    textTransform: 'capitalize'
                  }}>
                    {activeMenuSection.replace(/-/g, ' ')}
                  </h2>
                  <p style={{
                    fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
                    lineHeight: 1.9,
                    fontWeight: 400,
                    color: '#222222'
                  }}>
                    Content coming soon.
                  </p>
                </>
              )}
            </div>

            {/* Footer Navigation */}
            {(() => {
              const { prev, next } = getPrevNext(activeMenuSection);
              const hasPrev = !!prev;
              const hasNext = !!next;
              
              // Determine Close Page position
              // If no prev (first item) -> Close Page on LEFT
              // If no next (last item) -> Close Page on RIGHT
              // Otherwise -> Close Page in CENTER
              const closePagePosition = !hasPrev ? 'left' : !hasNext ? 'right' : 'center';
              
              const closePageElement = (
                <div
                  onClick={() => window.history.back()}
                  style={{
                    cursor: 'pointer',
                    color: '#000',
                    fontSize: '1rem',
                    fontWeight: 400,
                    paddingBottom: '2px',
                    opacity: 0.8,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                >
                  Close Page
                </div>
              );
              
              const prevElement = prev && (
                <div
                  onClick={() => setActiveMenuSection(prev.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    color: '#000',
                    opacity: 0.6,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                >
                  <span style={{ fontSize: '1.2rem' }}>←</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{prev.label}</span>
                </div>
              );
              
              const nextElement = next && (
                <div
                  onClick={() => setActiveMenuSection(next.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    color: '#000',
                    opacity: 0.6,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                >
                  <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{next.label}</span>
                  <span style={{ fontSize: '1.2rem' }}>→</span>
                </div>
              );
              
              return (
                <div style={{
                  width: '100%',
                  maxWidth: (isDesktop && (activeMenuSection === 'selected-works' || activeMenuSection === 'pricing')) ? '1000px' : '800px',
                  borderTop: '1px solid rgba(0,0,0,0.1)',
                  marginTop: '80px',
                  paddingTop: '60px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: '20px',
                  fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', sans-serif",
                }}>
                  {/* Left Column */}
                  <div style={{ justifySelf: 'start' }}>
                    {closePagePosition === 'left' ? closePageElement : prevElement}
                  </div>

                  {/* Center Column */}
                  <div style={{ justifySelf: 'center' }}>
                    {closePagePosition === 'center' && closePageElement}
                  </div>

                  {/* Right Column */}
                  <div style={{ justifySelf: 'end' }}>
                    {closePagePosition === 'right' ? closePageElement : nextElement}
                  </div>
                </div>
              );
            })()}
          </motion.div >
        )
        }
      </AnimatePresence >

      {/* LEFT MENU OVERLAY */}
      <AnimatePresence>
        {
          isMenuOpen && (
            <>
              {/* Backdrop - Click to Close */}
              <motion.div
                key="menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }} // Fully visible blur
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  backgroundColor: 'rgba(255, 255, 255, 0.4)', // Light backdrop
                  backdropFilter: 'blur(10px)', // Glassmorphism
                  WebkitBackdropFilter: 'blur(10px)',
                  zIndex: 49, // Behind menu (50)
                }}
                onClick={() => window.history.back()}
              />

              <motion.div
                key="left-menu"
                variants={menuOverlayVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: isDesktop ? '400px' : '65vw', // Approx 60% as requested
                  minWidth: isDesktop ? '400px' : '260px',
                  height: '100%',
                  backgroundColor: '#ffffff',
                  boxShadow: '15px 0 50px rgba(0,0,0,0.1)', // Stronger shadow for popup look
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '40px 30px', // Match the 40px top padding
                }}
              >
                {/* Close Button Top Right of Menu */}
                <div
                  style={{
                    position: 'absolute',
                    top: '40px', // Match site top padding
                    right: '30px', // Match site side padding
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    zIndex: 51
                  }}
                  onClick={() => window.history.back()}
                >
                  <Image
                    src="/click-to-close-menu-icon.png"
                    alt="Close Menu"
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>

                {/* High-End Corporate Menu */}
                <div style={{ marginTop: '60px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {[
                    'Why Choose Us',
                    'Our Work',
                    'Pricing',
                    'Journal',
                    'Vision 2030',
                    'Our Impact',
                    'Start a Project'
                  ].map((item, i) => (
                    <motion.div
                      key={item}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 + (i * 0.05), duration: 0.5 }}
                      style={{
                        fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', sans-serif",
                        fontSize: '1.5rem',
                        fontWeight: 400,
                        color: '#000000',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      whileHover={{ x: 10, color: '#333333' }}
                      onClick={() => {
                        // Map 'Our Work' to 'selected-works' to match bottom nav
                        const sectionId = item === 'Our Work'
                          ? 'selected-works'
                          : item.toLowerCase().replace(/ /g, '-');
                        setActiveMenuSection(sectionId);
                        setIsMenuOpen(false);
                        if (stage !== 'landing') {
                          setDirection(1);
                          setStage('landing');
                        }
                      }}
                    >
                      {item}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </>
          )
        }
      </AnimatePresence >

      {
        stage === 'intro' && (
          <motion.div
            style={{
              position: 'absolute',
              bottom: '60px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '32px',
              color: '#000',
              zIndex: 2,
              pointerEvents: 'none',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.5 }}
          >
            <motion.span
              style={{ display: 'inline-block' }}
              animate={{ y: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              ↑
            </motion.span>
          </motion.div>
        )
      }

      {/* Fullscreen Webview Modal */}
      <AnimatePresence>
        {webviewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 1000,
              backgroundColor: '#ffffff',
            }}
          >
            {/* Close Button - Top Right */}
            <motion.div
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                zIndex: 1001,
                cursor: 'pointer',
                fontSize: '1.5rem',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: '#fff',
                borderRadius: '50%',
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.history.back()}
            >
              ✕
            </motion.div>

            {/* Back to KiWA Labs - Middle Left */}
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '0',
                transform: 'translateY(-50%)',
                zIndex: 1001,
                cursor: 'pointer',
                padding: '12px 20px 12px 16px',
                backgroundColor: '#ffffff',
                color: '#000000',
                borderRadius: '0 30px 30px 0',
                boxShadow: '2px 4px 20px rgba(0, 0, 0, 0.15)',
                fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Roboto', sans-serif",
                fontSize: '0.9rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              whileHover={{
                x: 5,
                boxShadow: '4px 6px 25px rgba(0, 0, 0, 0.2)',
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.history.back()}
            >
              <span style={{ fontSize: '1rem' }}>←</span>
              Back to KiWA Labs
            </motion.div>

            {/* Iframe */}
            <iframe
              src={webviewUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title="Project Preview"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
}
