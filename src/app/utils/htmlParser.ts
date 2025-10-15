import * as cheerio from 'cheerio';

export interface AuthForm {
  hasPasswordInput: boolean;
  formElement: string | null;
  parentElement: string | null;
  inputCount: number;
  passwordInputs: Array<{
    selector: string;
    name?: string;
    id?: string;
    placeholder?: string;
    type?: string;
  }>;
  otherInputs: Array<{
    type: string;
    name?: string;
    id?: string;
    placeholder?: string;
  }>;
}

// Helper function to detect authentication context
function hasAuthenticationContext($: cheerio.CheerioAPI, $input: any): boolean {
  // Check for nearby authentication-related text
  const $parent = $input.parent();
  const $form = $input.closest('form');
  
  // Get text content from parent elements
  const parentText = $parent.text().toLowerCase();
  const formText = $form.length ? $form.text().toLowerCase() : '';
  
  // Look for strong authentication-related text patterns
  const strongAuthTextPatterns = [
    'sign in', 'signin', 'log in', 'login', 'log in to',
    'enter your password', 'forgot password', 'reset password', 
    'create account', 'sign up', 'register'
  ];
  
  const hasStrongAuthText = strongAuthTextPatterns.some(pattern => 
    parentText.includes(pattern) || formText.includes(pattern)
  );
  
  // Check for authentication-related buttons or links nearby
  const $nearbyButtons = $parent.find('button, input[type="submit"], a').add($form.find('button, input[type="submit"], a'));
  const buttonText = $nearbyButtons.text().toLowerCase();
  
  // STRICT: Look for strong authentication button patterns only
  const strongAuthButtonPatterns = [
    'sign in', 'signin', 'log in', 'login', 'sign up', 'register'
  ];
  
  const hasStrongAuthButton = strongAuthButtonPatterns.some(pattern => 
    buttonText.includes(pattern)
  );
  
  // STRICT: Require BOTH strong text AND strong button context
  return hasStrongAuthText && hasStrongAuthButton;
}

export function parseHtmlForAuthForms(html: string): AuthForm {
  const $ = cheerio.load(html);
  
  // FLEXIBLE REQUIREMENT: Look for authentication indicators
  // 1. Direct password inputs (most reliable)
  const passwordInputs = $('input[type="password"]');
  
  // 2. Look for strong authentication context even without password inputs
  // (for multipart auth, social login, etc.)
  const allInputs = $('input');
  const potentialAuthInputs = allInputs.filter((_, element) => {
    const $input = $(element);
    const attributes = [
      $input.attr('name'),
      $input.attr('id'),
      $input.attr('placeholder'),
      $input.attr('type'),
      $input.attr('class'),
      $input.attr('aria-label'),
      $input.attr('aria-labelledby'),
      $input.attr('autocomplete'),
      $input.attr('data-testid'),
      $input.attr('data-cy'),
      $input.attr('data-test')
    ].filter(attr => attr && attr !== 'undefined').join(' ').toLowerCase();
    
    // Check for password type first (most reliable)
    if ($input.attr('type') === 'password') {
        return true;
    }
    
    // Check for strong authentication keywords in attributes
    const strongAuthKeywords = [
      'email', 'username', 'user', 'login', 'signin', 'sign-in'
    ];
    
    const hasStrongAuthKeyword = strongAuthKeywords.some(keyword => 
      attributes.includes(keyword)
    );
    
    // Check for strong authentication context (nearby text, buttons, etc.)
    const hasStrongContext = hasAuthenticationContext($ as cheerio.CheerioAPI, $input);
    
    return hasStrongAuthKeyword && hasStrongContext;
  });
  
  // REQUIREMENT: Must have either password inputs OR strong auth context with email/username
  const hasPasswordInputs = passwordInputs.length > 0;
  const hasStrongAuthContext = potentialAuthInputs.length > 0;
  
  if (!hasPasswordInputs && !hasStrongAuthContext) {
    return {
      hasPasswordInput: false,
      formElement: null,
      parentElement: null,
      inputCount: 0,
      passwordInputs: [],
      otherInputs: []
    };
  }
  
  // Combine all authentication-related inputs
  const authInputs = potentialAuthInputs;
  
  const hasPasswordInput = hasPasswordInputs; // True if we found password inputs

  const authForm: AuthForm = {
    hasPasswordInput: true,
    formElement: null,
    parentElement: null,
    inputCount: 0,
    passwordInputs: [],
    otherInputs: []
  };

  // Separate password inputs from other authentication inputs
  const processedInputs = new Set<string>(); // Track processed inputs to avoid duplicates
  const allAuthInputs: any[] = []; // Store all auth inputs for processing
  
  authInputs.each((index, element) => {
    const $authInput = $(element);
    
    // Create a unique identifier for this input
    const inputId = $authInput.attr('id') || $authInput.attr('name') || `input-${index}`;
    const inputSelector = `${$authInput.attr('type') || 'input'}[${inputId ? `id="${inputId}"` : `name="${$authInput.attr('name')}"`}]`;
    
    // Skip if we've already processed this input
    if (processedInputs.has(inputSelector)) {
      return;
    }
    processedInputs.add(inputSelector);
    
    // Store input details
    allAuthInputs.push({
      element: $authInput,
      selector: $authInput.prop('outerHTML') || '',
      name: $authInput.attr('name') || undefined,
      id: $authInput.attr('id') || undefined,
      placeholder: $authInput.attr('placeholder') || undefined,
      type: $authInput.attr('type') || undefined
    });
  });
  
  // Now properly categorize: only actual password inputs go to passwordInputs
  allAuthInputs.forEach(input => {
    const $input = input.element;
    const inputType = $input.attr('type');
    
    // Only add to passwordInputs if it's actually a password input
    if (inputType === 'password') {
      authForm.passwordInputs.push({
        selector: input.selector,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        type: input.type
      });
    } else {
      // All other authentication-related inputs go to otherInputs
      authForm.otherInputs.push({
        type: input.id || input.type || 'text',
        name: input.name,
        id: input.id,
        placeholder: input.placeholder
      });
    }
  });

  // Find the most comprehensive parent that contains email/username AND password inputs
  if (allAuthInputs.length > 0) {
    const $firstAuthInput = allAuthInputs[0].element;
    let $parent = $firstAuthInput.parent();
    let bestParent = null;
    let bestParentScore = 0;
    let depth = 0;
    const maxDepth = 10; // Prevent going too far up the DOM tree

    while ($parent.length > 0 && depth < maxDepth) {
      // Skip body, html, and other top-level elements
      const tagName = $parent.prop('tagName')?.toLowerCase();
      if (tagName === 'body' || tagName === 'html' || tagName === 'head') {
        break;
      }

      // Check if this parent contains email/username inputs
      const hasEmailUsername = $parent.find('input').filter((_: any, el: any) => {
        const $el = $(el);
        const type = $el.attr('type')?.toLowerCase();
        const name = $el.attr('name')?.toLowerCase() || '';
        const id = $el.attr('id')?.toLowerCase() || '';
        const placeholder = $el.attr('placeholder')?.toLowerCase() || '';
        const className = $el.attr('class')?.toLowerCase() || '';
        
        return type === 'email' || type === 'text' && (
          name.includes('email') || name.includes('username') || name.includes('user') ||
          id.includes('email') || id.includes('username') || id.includes('user') ||
          placeholder.includes('email') || placeholder.includes('username') ||
          className.includes('email') || className.includes('username')
        );
      }).length > 0;

      // Check if this parent contains password inputs
      const hasPassword = $parent.find('input[type="password"]').length > 0;

      // FLEXIBLE: Consider parents that have either:
      // 1. Both email/username AND password inputs (traditional auth), OR
      // 2. Strong email/username context (multipart auth, social login, etc.)
      const isTraditionalAuth = hasEmailUsername && hasPassword;
      const isMultipartAuth = hasEmailUsername && !hasPassword; // Strong email/username context without password
      
      if (isTraditionalAuth || isMultipartAuth) {
        // Count total inputs in this parent (excluding hidden inputs)
        const totalInputsInParent = $parent.find('input').not('input[type="hidden"]').length;

        // Calculate score: prioritize traditional auth, then by input count
        const score = isTraditionalAuth ? totalInputsInParent + 100 : totalInputsInParent;

        // If this parent has a better score (more comprehensive), use it
        if (score > bestParentScore || !bestParent) {
          bestParent = $parent;
          bestParentScore = score;
        }
      }
      
      $parent = $parent.parent();
      depth++;
    }

    // Use the best parent we found, or fallback to the first auth input's immediate parent
    const $finalParent = bestParent || allAuthInputs[0].element.parent();
    
    if ($finalParent && $finalParent.length > 0) {
      authForm.parentElement = $finalParent.prop('outerHTML') || null;
      
      // Count all inputs in this parent (excluding hidden inputs)
      const allInputs = $finalParent.find('input').not('input[type="hidden"]');
      authForm.inputCount = allInputs.length;
      
      // Check if this parent is a form element
      if ($finalParent.is('form')) {
        authForm.formElement = $finalParent.prop('outerHTML') || null;
      }
    }
  }

  // Final deduplication step to ensure no duplicates remain
  const uniquePasswordInputs = authForm.passwordInputs.filter((input, index, self) => 
    index === self.findIndex(i => 
      i.id === input.id && i.name === input.name && i.type === input.type
    )
  );
  
  const uniqueOtherInputs = authForm.otherInputs.filter((input, index, self) => 
    index === self.findIndex(i => 
      i.id === input.id && i.name === input.name && i.type === input.type
    )
  );
  
  authForm.passwordInputs = uniquePasswordInputs;
  authForm.otherInputs = uniqueOtherInputs;

  // FINAL VALIDATION: Ensure we have a legitimate authentication form
  // For multipart auth: Must have either password inputs OR strong email/username context
  const finalHasPasswordInputs = authForm.passwordInputs.length > 0;
  const finalHasEmailUsernameInputs = authForm.otherInputs.some(input => {
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const type = (input.type || '').toLowerCase();
    
    return type === 'email' || 
           name.includes('email') || name.includes('username') || name.includes('user') ||
           id.includes('email') || id.includes('username') || id.includes('user') ||
           placeholder.includes('email') || placeholder.includes('username');
  });

  // FLEXIBLE VALIDATION: Accept if we have either:
  // 1. Password inputs (traditional auth), OR
  // 2. Strong email/username context (multipart auth, social login, etc.)
  if (!finalHasPasswordInputs && !finalHasEmailUsernameInputs) {
    return {
      hasPasswordInput: false,
      formElement: null,
      parentElement: null,
      inputCount: 0,
      passwordInputs: [],
      otherInputs: []
    };
  }

  return authForm;
}

export function extractFormContext(html: string, authForm: AuthForm): string {
  if (!authForm.parentElement) {
    return '';
  }

  const $ = cheerio.load(html);
  const $parent = $(authForm.parentElement);
  
  // Get the parent's context (siblings, nearby elements)
  const context = $parent.parent().html() || '';
  
  return context;
}

export function getFormSummary(authForm: AuthForm): string {
  if (!authForm.hasPasswordInput) {
    return 'No authentication forms detected';
  }

  const summary = [
    `Found ${authForm.passwordInputs.length} authentication input(s)`,
    `Parent element contains ${authForm.inputCount} total input(s)`,
    `Other inputs: ${authForm.otherInputs.map(input => input.id || input.type).join(', ')}`
  ];

  return summary.join(' • ');
}

// Debug function to help understand what's being detected
export function debugAuthDetection(html: string): any {
  const $ = cheerio.load(html);
  const allInputs = $('input');
  const debugInfo = {
    totalInputs: allInputs.length,
    passwordInputs: [] as any[],
    potentialAuthInputs: [] as any[],
    allInputDetails: [] as any[]
  };

  allInputs.each((index, element) => {
    const $input = $(element);
    const inputDetails = {
      index,
      type: $input.attr('type'),
      name: $input.attr('name'),
      id: $input.attr('id'),
      placeholder: $input.attr('placeholder'),
      class: $input.attr('class'),
      autocomplete: $input.attr('autocomplete')
    };

    debugInfo.allInputDetails.push(inputDetails);

    if ($input.attr('type') === 'password') {
      debugInfo.passwordInputs.push(inputDetails);
    }

    // Check if this could be an auth input
    const attributes = [
      $input.attr('name'),
      $input.attr('id'),
      $input.attr('placeholder'),
      $input.attr('type'),
      $input.attr('class'),
      $input.attr('autocomplete')
    ].filter(attr => attr && attr !== 'undefined').join(' ').toLowerCase();

    const authKeywords = [
      'password', 'pass', 'passwd', 'pwd',
      'email', 'username', 'user', 'login', 'signin', 'sign-in'
    ];

    if (authKeywords.some(keyword => attributes.includes(keyword))) {
      debugInfo.potentialAuthInputs.push(inputDetails);
    }
  });

  return debugInfo;
}
