/**
 * @jest-environment jsdom
 */

const { loadCategories } = require('../frontend/scripts/categories'); // adjust path

describe('Categories frontend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    document.body.innerHTML = `
      <div id="categoriesContainer"></div>
      <div id="emptyState"></div>
      <span id="categoryCount"></span>
    `;
  });

  it('should load and render categories correctly', async () => {
    // Mock fetch returning 2 categories
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { category_id: 1, name: 'Groceries', type: 'expense' },
        { category_id: 2, name: 'Salary', type: 'income' },
      ],
    });

    await loadCategories();

    expect(fetch).toHaveBeenCalledWith('/api/categories/1');

    const container = document.getElementById('categoriesContainer');
    const countBadge = document.getElementById('categoryCount');

    // Should render 2 categories
    expect(container.querySelectorAll('.category-item').length).toBe(2);
    // Count badge should update
    expect(countBadge.textContent).toContain('2 categories');
  });
});
