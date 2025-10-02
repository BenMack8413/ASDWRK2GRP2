// category-utils.js - Reusable utility functions for working with categories

const CategoryUtils = {
  // Cache for categories
  _cache: null,
  _budgetId: 1, // TODO: Replace with actual budget ID

  /**
   * Fetch all categories for the current budget
   * @param {boolean} forceRefresh - Force a fresh fetch, ignoring cache
   * @returns {Promise<Array>} Array of category objects
   */
  async getAll(forceRefresh = false) {
    if (!forceRefresh && this._cache) {
      return this._cache;
    }

    try {
      const res = await fetch(`/api/categories/${this._budgetId}`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      
      this._cache = await res.json();
      return this._cache;
    } catch (err) {
      console.error('Error fetching categories:', err);
      return [];
    }
  },

  /**
   * Get categories filtered by type
   * @param {string} type - 'income' or 'expense'
   * @returns {Promise<Array>} Filtered array of categories
   */
  async getByType(type) {
    const categories = await this.getAll();
    return categories.filter(cat => cat.type === type);
  },

  /**
   * Get a single category by ID
   * @param {number} categoryId
   * @returns {Promise<Object|null>} Category object or null
   */
  async getById(categoryId) {
    const categories = await this.getAll();
    return categories.find(cat => cat.category_id === categoryId) || null;
  },

  /**
   * Get category name by ID
   * @param {number} categoryId
   * @returns {Promise<string>} Category name or 'Unknown'
   */
  async getNameById(categoryId) {
    const category = await this.getById(categoryId);
    return category ? category.name : 'Unknown';
  },

  /**
   * Create a dropdown/select element populated with categories
   * @param {Object} options - Configuration options
   * @returns {Promise<HTMLSelectElement>} Select element with categories
   */
  async createSelect(options = {}) {
    const {
      id = '',
      className = 'form-input',
      type = null, // 'income', 'expense', or null for all
      includeEmpty = true,
      emptyText = '-- Select Category --',
      selectedId = null
    } = options;

    const select = document.createElement('select');
    if (id) select.id = id;
    if (className) select.className = className;

    // Add empty option
    if (includeEmpty) {
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = emptyText;
      select.appendChild(emptyOption);
    }

    // Get and filter categories
    let categories = await this.getAll();
    if (type) {
      categories = categories.filter(cat => cat.type === type);
    }

    // Sort alphabetically
    categories.sort((a, b) => a.name.localeCompare(b.name));

    // Add category options
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.category_id;
      option.textContent = cat.name;
      if (cat.category_id === selectedId) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    return select;
  },

  /**
   * Populate an existing select element with categories
   * @param {string|HTMLSelectElement} selectElement - ID or element
   * @param {Object} options - Configuration options
   */
  async populateSelect(selectElement, options = {}) {
    const select = typeof selectElement === 'string' 
      ? document.getElementById(selectElement)
      : selectElement;

    if (!select) {
      console.error('Select element not found');
      return;
    }

    const {
      type = null,
      includeEmpty = true,
      emptyText = '-- Select Category --',
      selectedId = null
    } = options;

    // Clear existing options
    select.innerHTML = '';

    // Add empty option
    if (includeEmpty) {
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = emptyText;
      select.appendChild(emptyOption);
    }

    // Get and filter categories
    let categories = await this.getAll();
    if (type) {
      categories = categories.filter(cat => cat.type === type);
    }

    // Sort alphabetically
    categories.sort((a, b) => a.name.localeCompare(b.name));

    // Add options
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.category_id;
      option.textContent = cat.name;
      if (cat.category_id === selectedId) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  },

  /**
   * Get formatted category badge HTML
   * @param {number} categoryId
   * @returns {Promise<string>} HTML string for category badge
   */
  async getBadgeHtml(categoryId) {
    const category = await this.getById(categoryId);
    if (!category) return '<span class="category-badge">Unknown</span>';

    const badgeClass = category.type === 'income' ? 'income' : 'expense';
    return `<span class="category-badge ${badgeClass}">${this.escapeHtml(category.name)}</span>`;
  },

  /**
   * Get category statistics
   * @param {number} categoryId
   * @returns {Promise<Object>} Stats object with transaction count and total
   */
  async getStats(categoryId) {
    try {
      const res = await fetch(`/api/categories/${categoryId}/stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return await res.json();
    } catch (err) {
      console.error('Error fetching category stats:', err);
      return null;
    }
  },

  /**
   * Refresh the category cache
   */
  async refresh() {
    return await this.getAll(true);
  },

  /**
   * Clear the category cache
   */
  clearCache() {
    this._cache = null;
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Make it available globally
window.CategoryUtils = CategoryUtils;