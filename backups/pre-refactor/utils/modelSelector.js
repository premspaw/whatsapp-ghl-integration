/**
 * Model Selection Utility for OpenRouter
 * Helps choose the best model based on conversation type and requirements
 */

class ModelSelector {
  constructor() {
    this.models = {
      // Fast and cost-effective models
      fast: {
        'anthropic/claude-3-haiku': {
          name: 'Claude 3 Haiku',
          speed: 'fast',
          cost: 'low',
          quality: 'high',
          bestFor: ['general', 'support', 'quick-responses']
        },
        'openai/gpt-4o-mini': {
          name: 'GPT-4o Mini',
          speed: 'very-fast',
          cost: 'very-low',
          quality: 'good',
          bestFor: ['simple', 'high-volume', 'budget']
        },
        'meta-llama/llama-3.1-8b-instruct': {
          name: 'Llama 3.1 8B',
          speed: 'fast',
          cost: 'very-low',
          quality: 'good',
          bestFor: ['budget', 'simple', 'high-volume']
        }
      },
      
      // Balanced models
      balanced: {
        'anthropic/claude-3-sonnet': {
          name: 'Claude 3 Sonnet',
          speed: 'medium',
          cost: 'medium',
          quality: 'very-high',
          bestFor: ['sales', 'complex-support', 'reasoning']
        },
        'openai/gpt-4o': {
          name: 'GPT-4o',
          speed: 'medium',
          cost: 'high',
          quality: 'very-high',
          bestFor: ['complex', 'technical', 'high-quality']
        },
        'google/gemini-pro': {
          name: 'Gemini Pro',
          speed: 'fast',
          cost: 'low',
          quality: 'high',
          bestFor: ['balanced', 'general', 'multilingual']
        }
      },
      
      // Specialized models
      specialized: {
        'anthropic/claude-3-opus': {
          name: 'Claude 3 Opus',
          speed: 'slow',
          cost: 'very-high',
          quality: 'excellent',
          bestFor: ['complex-reasoning', 'creative', 'analysis']
        },
        'openai/gpt-4-turbo': {
          name: 'GPT-4 Turbo',
          speed: 'medium',
          cost: 'high',
          quality: 'excellent',
          bestFor: ['complex-tasks', 'technical', 'reasoning']
        }
      }
    };
  }

  /**
   * Select the best model based on conversation type and requirements
   */
  selectModel(conversationType, requirements = {}) {
    const {
      prioritizeSpeed = false,
      prioritizeCost = false,
      prioritizeQuality = false,
      maxCost = 'medium',
      minQuality = 'good'
    } = requirements;

    let candidates = [];

    // Filter by conversation type
    Object.values(this.models).forEach(category => {
      Object.entries(category).forEach(([modelId, model]) => {
        if (model.bestFor.includes(conversationType)) {
          candidates.push({ modelId, ...model });
        }
      });
    });

    // If no specific matches, use general models
    if (candidates.length === 0) {
      candidates = Object.values(this.models.fast);
    }

    // Sort by priority
    if (prioritizeSpeed) {
      candidates.sort((a, b) => this.getSpeedScore(b) - this.getSpeedScore(a));
    } else if (prioritizeCost) {
      candidates.sort((a, b) => this.getCostScore(a) - this.getCostScore(b));
    } else if (prioritizeQuality) {
      candidates.sort((a, b) => this.getQualityScore(b) - this.getQualityScore(a));
    } else {
      // Balanced approach
      candidates.sort((a, b) => this.getBalancedScore(b) - this.getBalancedScore(a));
    }

    return candidates[0]?.modelId || 'anthropic/claude-3-haiku';
  }

  /**
   * Get model recommendations for different scenarios
   */
  getRecommendations() {
    return {
      customerSupport: {
        primary: 'anthropic/claude-3-haiku',
        fallback: 'openai/gpt-4o-mini',
        reason: 'Fast responses, good context understanding, cost-effective'
      },
      salesConversations: {
        primary: 'anthropic/claude-3-sonnet',
        fallback: 'openai/gpt-4o',
        reason: 'Better reasoning, persuasive responses, handles objections'
      },
      highVolume: {
        primary: 'openai/gpt-4o-mini',
        fallback: 'meta-llama/llama-3.1-8b-instruct',
        reason: 'Very fast, very cheap, good for simple queries'
      },
      complexSupport: {
        primary: 'anthropic/claude-3-sonnet',
        fallback: 'openai/gpt-4o',
        reason: 'Excellent reasoning, handles complex technical issues'
      },
      budgetConscious: {
        primary: 'meta-llama/llama-3.1-8b-instruct',
        fallback: 'openai/gpt-4o-mini',
        reason: 'Lowest cost, good performance for simple tasks'
      }
    };
  }

  /**
   * Get model information
   */
  getModelInfo(modelId) {
    for (const category of Object.values(this.models)) {
      if (category[modelId]) {
        return { modelId, ...category[modelId] };
      }
    }
    return null;
  }

  /**
   * Get all available models
   */
  getAllModels() {
    const allModels = {};
    Object.values(this.models).forEach(category => {
      Object.assign(allModels, category);
    });
    return allModels;
  }

  /**
   * Calculate speed score (higher is faster)
   */
  getSpeedScore(model) {
    const speedScores = {
      'very-fast': 5,
      'fast': 4,
      'medium': 3,
      'slow': 2
    };
    return speedScores[model.speed] || 3;
  }

  /**
   * Calculate cost score (lower is cheaper)
   */
  getCostScore(model) {
    const costScores = {
      'very-low': 1,
      'low': 2,
      'medium': 3,
      'high': 4,
      'very-high': 5
    };
    return costScores[model.cost] || 3;
  }

  /**
   * Calculate quality score (higher is better)
   */
  getQualityScore(model) {
    const qualityScores = {
      'good': 3,
      'high': 4,
      'very-high': 5,
      'excellent': 6
    };
    return qualityScores[model.quality] || 3;
  }

  /**
   * Calculate balanced score
   */
  getBalancedScore(model) {
    const speedScore = this.getSpeedScore(model);
    const costScore = 6 - this.getCostScore(model); // Invert cost (lower is better)
    const qualityScore = this.getQualityScore(model);
    
    return (speedScore + costScore + qualityScore) / 3;
  }

  /**
   * Get model comparison table
   */
  getComparisonTable() {
    const models = this.getAllModels();
    const table = [];
    
    Object.entries(models).forEach(([modelId, model]) => {
      table.push({
        model: modelId,
        name: model.name,
        speed: model.speed,
        cost: model.cost,
        quality: model.quality,
        bestFor: model.bestFor.join(', ')
      });
    });
    
    return table;
  }
}

module.exports = ModelSelector;
