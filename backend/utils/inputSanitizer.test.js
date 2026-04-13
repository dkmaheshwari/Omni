// backend/utils/inputSanitizer.test.js - Input sanitization tests (95% coverage target)
const {
  sanitizeSearchQuery,
  sanitizeUserInput,
  sanitizeFilename,
  validateAndSanitizeEmail,
  sanitizeHtml,
  sanitizeMongoQuery,
  isValidObjectId,
  sanitizeThreadData,
  sanitizeMessageData,
} = require('../utils/inputSanitizer');

describe('NoSQL Injection Prevention', () => {
  describe('sanitizeSearchQuery', () => {
    it('should remove MongoDB operators from search queries', () => {
      const maliciousQueries = [
        '{"$ne": null}',
        '{$gt: ""}',
        '{"$where": "this.username == this.password"}',
        '$ne',
        '{$regex: ".*"}',
        '{"$or": [{"username": "admin"}, {"password": ""}]}',
      ];

      maliciousQueries.forEach(query => {
        const result = sanitizeSearchQuery(query);
        expect(result).not.toContain('$ne');
        expect(result).not.toContain('$gt');
        expect(result).not.toContain('$where');
        expect(result).not.toContain('$regex');
        expect(result).not.toContain('$or');
        expect(result).toBeTruthy(); // Should return clean string
      });
    });

    it('should preserve safe search terms', () => {
      const safeQueries = [
        'javascript tutorial',
        'math homework help',
        'project ideas',
        'study group discussion',
        'C++ programming guide',
      ];

      safeQueries.forEach(query => {
        const result = sanitizeSearchQuery(query);
        expect(result).toBe(query); // Should remain unchanged
      });
    });

    it('should handle mixed content appropriately', () => {
      const mixedQuery = 'javascript tutorial $ne admin';
      const result = sanitizeSearchQuery(mixedQuery);
      
      expect(result).toContain('javascript tutorial');
      expect(result).toContain('admin');
      expect(result).not.toContain('$ne');
    });

    it('should handle edge cases', () => {
      expect(sanitizeSearchQuery('')).toBe('');
      expect(sanitizeSearchQuery(null)).toBe('');
      expect(sanitizeSearchQuery(undefined)).toBe('');
      expect(sanitizeSearchQuery(123)).toBe('123');
    });
  });

  describe('sanitizeMongoQuery', () => {
    it('should sanitize MongoDB query objects', () => {
      const maliciousQuery = {
        username: { $ne: null },
        password: { $exists: true },
        $where: 'this.username == this.password',
      };

      const result = sanitizeMongoQuery(maliciousQuery);
      
      expect(result).not.toHaveProperty('$where');
      expect(result.username).not.toHaveProperty('$ne');
      expect(result.password).not.toHaveProperty('$exists');
    });

    it('should preserve safe query fields', () => {
      const safeQuery = {
        username: 'testuser',
        email: 'test@example.com',
        threadId: '507f1f77bcf86cd799439011',
      };

      const result = sanitizeMongoQuery(safeQuery);
      expect(result).toEqual(safeQuery);
    });

    it('should handle nested query objects', () => {
      const nestedQuery = {
        user: {
          profile: {
            $ne: null,
            name: 'Test User',
          },
        },
        $or: [{ active: true }, { status: 'pending' }],
      };

      const result = sanitizeMongoQuery(nestedQuery);
      
      expect(result).not.toHaveProperty('$or');
      expect(result.user.profile).not.toHaveProperty('$ne');
      expect(result.user.profile.name).toBe('Test User');
    });
  });
});

describe('XSS Prevention', () => {
  describe('sanitizeHtml', () => {
    it('should remove dangerous HTML tags and attributes', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '<iframe src="evil.com"></iframe>',
        '<a href="javascript:alert(1)">Click me</a>',
        '<div onclick="alert(1)">Click</div>',
        '<style>body { background: url("javascript:alert(1)") }</style>',
      ];

      maliciousInputs.forEach(input => {
        const result = sanitizeHtml(input);
        expect(result).not.toContain('<script');
        expect(result).not.toContain('<iframe');
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onclick');
        expect(result).not.toContain('<style');
      });
    });

    it('should preserve safe HTML when allowBasicFormatting is true', () => {
      const safeHtml = 'This is <b>bold</b> and <i>italic</i> text with a <a href="https://example.com">link</a>.';
      const result = sanitizeHtml(safeHtml, { allowBasicFormatting: true });
      
      expect(result).toContain('<b>bold</b>');
      expect(result).toContain('<i>italic</i>');
      expect(result).toContain('href="https://example.com"');
    });

    it('should strip all HTML when allowBasicFormatting is false', () => {
      const htmlInput = 'This is <b>bold</b> and <i>italic</i> text.';
      const result = sanitizeHtml(htmlInput, { allowBasicFormatting: false });
      
      expect(result).toBe('This is bold and italic text.');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });
  });

  describe('sanitizeUserInput', () => {
    it('should sanitize various user input types', () => {
      const inputs = [
        { type: 'message', value: '<script>alert("xss")</script>Hello' },
        { type: 'email', value: '  TEST@Example.COM  ' },
        { type: 'filename', value: '../../../etc/passwd' },
        { type: 'general', value: 'Normal text with <script>alert(1)</script>' },
      ];

      inputs.forEach(({ type, value }) => {
        const result = sanitizeUserInput(value, type);
        expect(result).toBeTruthy();
        expect(result).not.toContain('<script');
        expect(result).not.toContain('javascript:');
        
        if (type === 'email') {
          expect(result).toBe('test@example.com');
        }
        if (type === 'filename') {
          expect(result).not.toContain('../');
        }
      });
    });
  });
});

describe('File Security', () => {
  describe('sanitizeFilename', () => {
    it('should remove path traversal attempts', () => {
      const dangerousNames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        '....//....//....//etc/passwd',
      ];

      dangerousNames.forEach(name => {
        const result = sanitizeFilename(name);
        expect(result).not.toContain('../');
        expect(result).not.toContain('..\\');
        expect(result).not.toContain('/etc/');
        expect(result).not.toContain('C:\\');
      });
    });

    it('should remove dangerous file extensions', () => {
      const dangerousFiles = [
        'virus.exe',
        'malware.bat',
        'script.scr',
        'trojan.pif',
        'backdoor.com',
      ];

      dangerousFiles.forEach(filename => {
        const result = sanitizeFilename(filename);
        // Should either reject or change extension
        expect(result).not.toMatch(/\.(exe|bat|scr|pif|com)$/i);
      });
    });

    it('should handle Windows reserved names', () => {
      const reservedNames = [
        'CON.txt',
        'PRN.doc',
        'AUX.pdf',
        'NUL.jpg',
        'COM1.zip',
        'LPT1.rar',
      ];

      reservedNames.forEach(name => {
        const result = sanitizeFilename(name);
        expect(result).not.toMatch(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])\./i);
      });
    });

    it('should preserve safe filenames', () => {
      const safeNames = [
        'document.pdf',
        'image.jpg',
        'spreadsheet.xlsx',
        'presentation.pptx',
        'code-file.js',
        'my_document_v2.docx',
      ];

      safeNames.forEach(name => {
        const result = sanitizeFilename(name);
        // Should be mostly unchanged (maybe case normalization)
        expect(result.toLowerCase()).toContain(name.split('.')[0].toLowerCase());
      });
    });
  });
});

describe('Data Validation', () => {
  describe('validateAndSanitizeEmail', () => {
    it('should validate and sanitize email addresses', () => {
      const testCases = [
        { input: '  TEST@Example.COM  ', expected: 'test@example.com', valid: true },
        { input: 'user.name@domain.co.uk', expected: 'user.name@domain.co.uk', valid: true },
        { input: 'invalid-email', expected: null, valid: false },
        { input: '@example.com', expected: null, valid: false },
        { input: 'user@', expected: null, valid: false },
      ];

      testCases.forEach(({ input, expected, valid }) => {
        const result = validateAndSanitizeEmail(input);
        if (valid) {
          expect(result.isValid).toBe(true);
          expect(result.sanitized).toBe(expected);
        } else {
          expect(result.isValid).toBe(false);
          expect(result.sanitized).toBeNull();
        }
      });
    });
  });

  describe('isValidObjectId', () => {
    it('should validate MongoDB ObjectIds', () => {
      const validIds = [
        '507f1f77bcf86cd799439011',
        '5f8a7b2c9d3e4f5a6b7c8d9e',
        '1234567890abcdef12345678',
      ];

      const invalidIds = [
        'invalid-id',
        '507f1f77bcf86cd79943901', // Too short
        '507f1f77bcf86cd799439011z', // Invalid character
        '',
        null,
        undefined,
        123,
      ];

      validIds.forEach(id => {
        expect(isValidObjectId(id)).toBe(true);
      });

      invalidIds.forEach(id => {
        expect(isValidObjectId(id)).toBe(false);
      });
    });
  });
});

describe('Application-Specific Sanitization', () => {
  describe('sanitizeThreadData', () => {
    it('should sanitize thread creation data', () => {
      const threadData = {
        title: '<script>alert("xss")</script>Study Group',
        description: 'This is a <b>study group</b> for <script>alert(1)</script>learning.',
        isPublic: 'true', // String instead of boolean
        tags: ['math', '<script>alert(1)</script>', 'study'],
        invalidField: '{"$ne": null}',
      };

      const result = sanitizeThreadData(threadData);
      
      expect(result.title).not.toContain('<script');
      expect(result.title).toContain('Study Group');
      expect(result.description).not.toContain('<script');
      expect(result.isPublic).toBe(true); // Should be converted to boolean
      expect(result.tags).not.toContain('<script>alert(1)</script>');
      expect(result.tags).toContain('math');
      expect(result.tags).toContain('study');
      expect(result).not.toHaveProperty('invalidField');
    });
  });

  describe('sanitizeMessageData', () => {
    it('should sanitize message data', () => {
      const messageData = {
        content: '<script>alert("xss")</script>Hello everyone!',
        threadId: '507f1f77bcf86cd799439011',
        sender: '  TEST@Example.COM  ',
        metadata: {
          clientInfo: 'Mozilla/5.0...',
          $where: 'this.isAdmin == true',
        },
      };

      const result = sanitizeMessageData(messageData);
      
      expect(result.content).not.toContain('<script');
      expect(result.content).toContain('Hello everyone!');
      expect(result.threadId).toBe('507f1f77bcf86cd799439011');
      expect(result.sender).toBe('test@example.com');
      expect(result.metadata).not.toHaveProperty('$where');
      expect(result.metadata.clientInfo).toBeTruthy();
    });

    it('should reject invalid thread IDs', () => {
      const messageData = {
        content: 'Hello',
        threadId: 'invalid-thread-id',
        sender: 'test@example.com',
      };

      expect(() => sanitizeMessageData(messageData)).toThrow();
    });
  });
});

describe('Performance and Edge Cases', () => {
  it('should handle large inputs efficiently', () => {
    const largeInput = 'x'.repeat(10000) + '<script>alert("xss")</script>';
    
    const start = performance.now();
    const result = sanitizeHtml(largeInput);
    const end = performance.now();
    
    expect(result).not.toContain('<script');
    expect(end - start).toBeLessThan(100); // Should complete quickly
  });

  it('should handle null and undefined inputs gracefully', () => {
    const functions = [
      sanitizeSearchQuery,
      sanitizeUserInput,
      sanitizeFilename,
      sanitizeHtml,
    ];

    functions.forEach(fn => {
      expect(() => fn(null)).not.toThrow();
      expect(() => fn(undefined)).not.toThrow();
      expect(() => fn('')).not.toThrow();
    });
  });

  it('should handle circular objects in sanitizeMongoQuery', () => {
    const circularObj = { name: 'test' };
    circularObj.self = circularObj;
    
    expect(() => sanitizeMongoQuery(circularObj)).not.toThrow();
  });
});