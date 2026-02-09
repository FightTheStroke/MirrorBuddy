/**
 * Tests for Homework Handler Execution
 * Coverage improvement for tools/handlers/homework-handler.ts
 * Tests: analyzeHomework, extractTextFromImage, handler callback
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Use vi.hoisted() so these are available when vi.mock() factory runs
const {
  capturedHandler,
  mockChatCompletion,
  mockExtractTextFromPDF,
  mockRegisterToolHandler,
  mockFetch,
} = vi.hoisted(() => {
  let handler: ((args: Record<string, unknown>) => Promise<unknown>) | null = null;

  return {
    capturedHandler: { get: () => handler },
    mockRegisterToolHandler: vi.fn(
      (toolId: string, h: (args: Record<string, unknown>) => Promise<unknown>) => {
        if (toolId === 'homework_help') {
          handler = h;
        }
      },
    ),
    mockChatCompletion: vi.fn(() =>
      Promise.resolve({
        content:
          '{"exerciseType": "math", "problemStatement": "Solve x", "hints": ["Think about it"]}',
      }),
    ),
    mockExtractTextFromPDF: vi.fn(() => Promise.resolve({ text: 'PDF extracted text' })),
    mockFetch: vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Extracted image text' } }],
          }),
      }),
    ),
  };
});

vi.mock('../../tool-executor', () => ({
  registerToolHandler: mockRegisterToolHandler,
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-id-123'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@/lib/ai/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/server')>();
  return {
    ...actual,
    chatCompletion: mockChatCompletion,
    getDeploymentForModel: vi.fn((model: string) => model),
  };
});

// Mock tier service (ADR 0073)
vi.mock('@/lib/tier/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tier/server')>();
  return {
    ...actual,
    tierService: {
      getFeatureAIConfigForUser: vi.fn(() =>
        Promise.resolve({
          model: 'gpt-5-mini',
          temperature: 0.6,
          maxTokens: 3000,
        }),
      ),
    },
  };
});

// Mock the nested module where extractTextFromPDF is actually defined
vi.mock('../study-kit-handler/pdf-extraction', () => ({
  extractTextFromPDF: mockExtractTextFromPDF,
}));

// Also mock the re-export barrel
vi.mock('../study-kit-handler', () => ({
  extractTextFromPDF: mockExtractTextFromPDF,
}));

// Mock global fetch
vi.stubGlobal('fetch', mockFetch);

describe('homework-handler execution', () => {
  beforeAll(async () => {
    // Set up Azure env vars for extractTextFromImage tests
    process.env.AZURE_OPENAI_API_KEY = 'test-key';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_OPENAI_VISION_DEPLOYMENT = 'gpt-4-vision';
    process.env.AZURE_OPENAI_API_VERSION = '2024-08-01-preview';

    // Import the module AFTER mocks are set up to trigger handler registration
    await import('../homework-handler');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockChatCompletion.mockResolvedValue({
      content:
        '{"exerciseType": "math", "problemStatement": "Solve x", "hints": ["Think about it"]}',
    });
    mockExtractTextFromPDF.mockResolvedValue({ text: 'PDF extracted text' });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: 'Extracted image text' } }],
        }),
    });
    // Restore env vars
    process.env.AZURE_OPENAI_API_KEY = 'test-key';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_OPENAI_VISION_DEPLOYMENT = 'gpt-4-vision';
  });

  it('should have captured the handler', () => {
    expect(capturedHandler.get()).not.toBeNull();
  });

  describe('handler - text input', () => {
    it('processes text input successfully', async () => {
      const result = (await capturedHandler.get()!({
        text: 'Solve 2x + 5 = 15',
      })) as {
        success: boolean;
        data: { sourceType: string; exerciseType: string };
      };

      expect(result.success).toBe(true);
      expect(result.data.sourceType).toBe('text');
      expect(result.data.exerciseType).toBe('math');
    });

    it('returns error for empty text', async () => {
      // Empty string is falsy, so it triggers the "no input" validation error
      const result = await capturedHandler.get()!({
        text: '',
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Devi fornire'),
      });
    });

    it('returns error for whitespace-only text', async () => {
      const result = await capturedHandler.get()!({
        text: '   \n\t  ',
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Nessun testo trovato'),
      });
    });
  });

  describe('handler - PDF input', () => {
    it('processes PDF with base64 string', async () => {
      const base64Data = Buffer.from('test pdf content').toString('base64');
      const result = (await capturedHandler.get()!({
        fileType: 'pdf',
        fileData: base64Data,
      })) as { success: boolean; data: { sourceType: string } };

      expect(result.success).toBe(true);
      expect(result.data.sourceType).toBe('pdf');
      expect(mockExtractTextFromPDF).toHaveBeenCalled();
    });

    it('processes PDF with ArrayBuffer', async () => {
      const arrayBuffer = new ArrayBuffer(10);
      const result = (await capturedHandler.get()!({
        fileType: 'pdf',
        fileData: arrayBuffer,
      })) as { success: boolean; data: { sourceType: string } };

      expect(result.success).toBe(true);
      expect(result.data.sourceType).toBe('pdf');
    });

    it('returns error when PDF extraction returns empty', async () => {
      mockExtractTextFromPDF.mockResolvedValueOnce({ text: '' });

      const result = await capturedHandler.get()!({
        fileType: 'pdf',
        fileData: 'somedata',
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Nessun testo trovato'),
      });
    });
  });

  describe('handler - image input', () => {
    it('processes image with data URL string', async () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
      const result = (await capturedHandler.get()!({
        fileType: 'image',
        fileData: dataUrl,
      })) as { success: boolean; data: { sourceType: string } };

      expect(result.success).toBe(true);
      expect(result.data.sourceType).toBe('image');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('processes image with plain base64 string', async () => {
      const base64 = 'iVBORw0KGgo=';
      const result = (await capturedHandler.get()!({
        fileType: 'image',
        fileData: base64,
      })) as { success: boolean; data: { sourceType: string } };

      expect(result.success).toBe(true);
      expect(result.data.sourceType).toBe('image');
    });

    it('processes image with ArrayBuffer', async () => {
      const arrayBuffer = new ArrayBuffer(10);
      const result = (await capturedHandler.get()!({
        fileType: 'image',
        fileData: arrayBuffer,
      })) as { success: boolean; data: { sourceType: string } };

      expect(result.success).toBe(true);
      expect(result.data.sourceType).toBe('image');
    });

    it('returns error when image extraction returns empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: '  ' } }],
          }),
      });

      const result = await capturedHandler.get()!({
        fileType: 'image',
        fileData: 'data:image/png;base64,xyz',
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Nessun testo trovato'),
      });
    });
  });

  describe('handler - validation errors', () => {
    it('returns error when no input provided', async () => {
      const result = await capturedHandler.get()!({});

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Devi fornire'),
      });
    });

    it('returns error when fileType provided without fileData', async () => {
      const result = await capturedHandler.get()!({
        fileType: 'pdf',
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Devi fornire'),
      });
    });
  });

  describe('handler - error handling', () => {
    it('handles PDF extraction error', async () => {
      mockExtractTextFromPDF.mockRejectedValueOnce(new Error('PDF parsing failed'));

      const result = await capturedHandler.get()!({
        fileType: 'pdf',
        fileData: 'data',
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('PDF parsing failed'),
      });
    });

    it('handles image extraction error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await capturedHandler.get()!({
        fileType: 'image',
        fileData: 'data',
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('immagine'),
      });
    });

    it('handles non-Error exception', async () => {
      mockExtractTextFromPDF.mockRejectedValueOnce('string error');

      const result = await capturedHandler.get()!({
        fileType: 'pdf',
        fileData: 'data',
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Errore elaborazione'),
      });
    });
  });

  describe('handler - result structure', () => {
    it('includes toolId and toolType', async () => {
      const result = (await capturedHandler.get()!({
        text: 'Some homework',
      })) as { toolId: string; toolType: string };

      expect(result.toolId).toBe('test-id-123');
      expect(result.toolType).toBe('homework');
    });

    it('includes full homework data structure', async () => {
      mockChatCompletion.mockResolvedValueOnce({
        content: JSON.stringify({
          exerciseType: 'physics',
          problemStatement: 'Calculate velocity',
          givenData: ['mass = 5kg'],
          topic: 'Mechanics',
          difficulty: 'medium',
          hints: ['Use F = ma'],
        }),
      });

      const result = (await capturedHandler.get()!({
        text: 'Calculate velocity given mass and force',
      })) as { success: boolean; data: Record<string, unknown> };

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('homework');
      expect(result.data.exerciseType).toBe('physics');
      expect(result.data.topic).toBe('Mechanics');
      expect(result.data.difficulty).toBe('medium');
      expect(result.data.givenData).toEqual(['mass = 5kg']);
    });
  });
});

describe('analyzeHomework', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses valid JSON response', async () => {
    mockChatCompletion.mockResolvedValueOnce({
      content: '{"exerciseType": "algebra", "problemStatement": "Solve", "hints": ["Step 1"]}',
    });

    const { analyzeHomework } = await import('../homework-handler');
    const result = await analyzeHomework('Some math problem', 'text');

    expect(result.exerciseType).toBe('algebra');
    expect(result.problemStatement).toBe('Solve');
    expect(result.hints).toEqual(['Step 1']);
  });

  it('falls back to defaults when no JSON in response', async () => {
    mockChatCompletion.mockResolvedValueOnce({
      content: 'This is not JSON at all',
    });

    const { analyzeHomework } = await import('../homework-handler');
    const result = await analyzeHomework('Some problem text', 'text');

    expect(result.exerciseType).toBe('unknown');
    expect(result.problemStatement).toBe('Some problem text');
    expect(result.hints).toHaveLength(3);
    expect(result.hints?.[0]).toContain('chiesto');
  });

  it('falls back to defaults when chatCompletion throws', async () => {
    mockChatCompletion.mockRejectedValueOnce(new Error('API error'));

    const { analyzeHomework } = await import('../homework-handler');
    const result = await analyzeHomework('Problem text', 'text');

    expect(result.exerciseType).toBe('unknown');
    expect(result.hints).toHaveLength(3);
  });

  it('truncates long text in problemStatement fallback', async () => {
    mockChatCompletion.mockResolvedValueOnce({
      content: 'Invalid response',
    });

    const { analyzeHomework } = await import('../homework-handler');
    const longText = 'A'.repeat(1000);
    const result = await analyzeHomework(longText, 'text');

    expect(result.problemStatement.length).toBe(500);
  });

  it('handles missing fields in JSON response', async () => {
    mockChatCompletion.mockResolvedValueOnce({
      content: '{"exerciseType": "math"}',
    });

    const { analyzeHomework } = await import('../homework-handler');
    const result = await analyzeHomework('Problem', 'text');

    expect(result.exerciseType).toBe('math');
    expect(result.problemStatement).toBe('Problem');
    expect(result.hints).toHaveLength(3); // Default hints
  });

  it('converts non-array givenData to undefined', async () => {
    mockChatCompletion.mockResolvedValueOnce({
      content: '{"exerciseType": "math", "givenData": "not an array"}',
    });

    const { analyzeHomework } = await import('../homework-handler');
    const result = await analyzeHomework('Problem', 'text');

    expect(result.givenData).toBeUndefined();
  });
});

describe('extractTextFromImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AZURE_OPENAI_API_KEY = 'test-key';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_OPENAI_VISION_DEPLOYMENT = 'gpt-4-vision';
  });

  it('throws when Azure config is missing', async () => {
    delete process.env.AZURE_OPENAI_API_KEY;

    const { extractTextFromImage } = await import('../homework-handler');

    await expect(extractTextFromImage('image-data')).rejects.toThrow(
      'Azure OpenAI configuration missing',
    );
  });

  it('throws when endpoint is missing', async () => {
    delete process.env.AZURE_OPENAI_ENDPOINT;

    const { extractTextFromImage } = await import('../homework-handler');

    await expect(extractTextFromImage('image-data')).rejects.toThrow(
      'Azure OpenAI configuration missing',
    );
  });

  it('throws when deployment is missing', async () => {
    delete process.env.AZURE_OPENAI_VISION_DEPLOYMENT;
    delete process.env.AZURE_OPENAI_DEPLOYMENT;

    const { extractTextFromImage } = await import('../homework-handler');

    await expect(extractTextFromImage('image-data')).rejects.toThrow(
      'Azure OpenAI configuration missing',
    );
  });

  it('extracts text from image successfully', async () => {
    process.env.AZURE_OPENAI_API_KEY = 'test-key';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_OPENAI_VISION_DEPLOYMENT = 'gpt-4-vision';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: '  Extracted text with spaces  ' } }],
        }),
    });

    const { extractTextFromImage } = await import('../homework-handler');
    const result = await extractTextFromImage('data:image/png;base64,xyz');

    expect(result).toBe('Extracted text with spaces');
  });

  it('adds data URL prefix for base64 string', async () => {
    process.env.AZURE_OPENAI_API_KEY = 'test-key';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_OPENAI_VISION_DEPLOYMENT = 'gpt-4-vision';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: 'Text' } }],
        }),
    });

    const { extractTextFromImage } = await import('../homework-handler');
    await extractTextFromImage('base64string');

    const callArgs = mockFetch.mock.calls[0] as unknown as [string, { body: string }];
    const body = JSON.parse(callArgs[1].body);
    expect(body.messages[0].content[1].image_url.url).toBe('data:image/jpeg;base64,base64string');
  });

  it('throws when API response is not ok', async () => {
    process.env.AZURE_OPENAI_API_KEY = 'test-key';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_OPENAI_VISION_DEPLOYMENT = 'gpt-4-vision';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve('Bad request'),
    } as Response);

    const { extractTextFromImage } = await import('../homework-handler');

    await expect(extractTextFromImage('image-data')).rejects.toThrow(
      "Impossibile estrarre il testo dall'immagine",
    );
  });

  it('throws when response has no content', async () => {
    process.env.AZURE_OPENAI_API_KEY = 'test-key';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_OPENAI_VISION_DEPLOYMENT = 'gpt-4-vision';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: '' } }],
        }),
    });

    const { extractTextFromImage } = await import('../homework-handler');

    await expect(extractTextFromImage('image-data')).rejects.toThrow(
      "Impossibile estrarre il testo dall'immagine",
    );
  });

  it('uses fallback deployment when vision deployment not set', async () => {
    delete process.env.AZURE_OPENAI_VISION_DEPLOYMENT;
    process.env.AZURE_OPENAI_DEPLOYMENT = 'gpt-4';
    process.env.AZURE_OPENAI_API_KEY = 'test-key';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: 'Text' } }],
        }),
    });

    const { extractTextFromImage } = await import('../homework-handler');
    await extractTextFromImage('data:image/png;base64,xyz');

    const callUrl = (mockFetch.mock.calls[0] as unknown as [string])[0];
    expect(callUrl).toContain('gpt-4');
  });
});
