// categories.js - Frontend controller for categories management

let currentFilter = 'all';
let allCategories = [];
const budgetId = 1; // TODO: Replace with actual logged-in user's budget

// ---------------------------
// Load all categories
// ---------------------------
async function loadCategories() {
    try {
        const res = await fetch(`/api/categories/${budgetId}`);
        if (!res.ok) throw new Error('Failed to load categories');

        allCategories = await res.json();
        renderCategories();
    } catch (err) {
        console.error('Error loading categories:', err);
        showError('Failed to load categories');
    }
}

// ---------------------------
// Render categories list
// ---------------------------
function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    const emptyState = document.getElementById('emptyState');
    const countBadge = document.getElementById('categoryCount');

    // Filter categories based on current filter
    const filtered =
        currentFilter === 'all'
            ? allCategories
            : allCategories.filter((cat) => cat.type === currentFilter);

    // Update count
    countBadge.textContent = `${filtered.length} ${filtered.length === 1 ? 'category' : 'categories'}`;

    // Show empty state if no categories
    if (filtered.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';

    // Render category items
    container.innerHTML = filtered
        .map(
            (category) => `
    <div class="category-item" data-type="${category.type}">
      <div class="category-info">
        <div class="category-icon ${category.type}">
          ${category.type === 'expense' ? '💰' : '💵'}
        </div>
        <div class="category-details">
          <div class="category-name">${escapeHtml(category.name)}</div>
          <div class="category-meta">
            <span class="category-type-badge ${category.type}">${category.type}</span>
          </div>
        </div>
      </div>
      <div class="category-actions">
        <button class="icon-btn edit" onclick="editCategory(${category.category_id})" title="Edit">
          ✏️
        </button>
        <button class="icon-btn delete" onclick="deleteCategory(${category.category_id})" title="Delete">
          🗑️
        </button>
      </div>
    </div>
  `,
        )
        .join('');
}

// ---------------------------
// Show/Hide Category Form
// ---------------------------
function toggleCategoryForm(show, isEdit = false) {
    const form = document.getElementById('categoryForm');
    const formTitle = document.getElementById('formTitle');

    form.style.display = show ? 'block' : 'none';
    formTitle.textContent = isEdit ? 'Edit Category' : 'Add New Category';

    if (!show) {
        // Reset form
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryType').value = 'expense';
        document.getElementById('editCategoryId').value = '';
    }
}

// ---------------------------
// Save category (create or update)
// ---------------------------
async function saveCategory() {
    const name = document.getElementById('categoryName').value.trim();
    const type = document.getElementById('categoryType').value;
    const editId = document.getElementById('editCategoryId').value;

    // Validation
    if (!name) {
        alert('Please enter a category name');
        return;
    }

    try {
        let res;

        if (editId) {
            // Update existing category
            res = await fetch(`/api/categories/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, type }),
            });
        } else {
            // Create new category
            res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ budgetId, name, type }),
            });
        }

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to save category');
        }

        // Reload categories and hide form
        await loadCategories();
        toggleCategoryForm(false);

        showSuccess(
            editId
                ? 'Category updated successfully!'
                : 'Category created successfully!',
        );
    } catch (err) {
        console.error('Error saving category:', err);
        alert(err.message || 'Failed to save category');
    }
}

// ---------------------------
// Edit category
// ---------------------------
function editCategory(categoryId) {
    const category = allCategories.find((c) => c.category_id === categoryId);
    if (!category) return;

    // Populate form
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryType').value = category.type;
    document.getElementById('editCategoryId').value = categoryId;

    // Show form
    toggleCategoryForm(true, true);

    // Scroll to form
    document
        .getElementById('categoryForm')
        .scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---------------------------
// Delete category
// ---------------------------
async function deleteCategory(categoryId) {
    const category = allCategories.find((c) => c.category_id === categoryId);
    if (!category) return;

    if (
        !confirm(
            `Are you sure you want to delete "${category.name}"?\n\nThis action cannot be undone.`,
        )
    ) {
        return;
    }

    try {
        const res = await fetch(`/api/categories/${categoryId}`, {
            method: 'DELETE',
        });

        if (!res.ok) {
            const error = await res.json();
            if (error.transactionCount) {
                alert(
                    `Cannot delete this category because it is used in ${error.transactionCount} transaction(s).\n\nPlease reassign those transactions first.`,
                );
            } else {
                throw new Error(error.error || 'Failed to delete category');
            }
            return;
        }

        // Reload categories
        await loadCategories();
        showSuccess('Category deleted successfully!');
    } catch (err) {
        console.error('Error deleting category:', err);
        alert(err.message || 'Failed to delete category');
    }
}

// ---------------------------
// Handle filter change
// ---------------------------
function handleFilterChange(filter) {
    currentFilter = filter;

    // Update active tab
    document.querySelectorAll('.filter-tab').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });

    // Re-render categories
    renderCategories();
}

// ---------------------------
// Utility functions
// ---------------------------
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSuccess(message) {
    // Simple success notification (you can enhance this)
    const notification = document.createElement('div');
    notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showError(message) {
    alert(message);
}

// ---------------------------
// Initialize on page load
// ---------------------------
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();

    // Hook up buttons
    document
        .getElementById('addCategoryBtn')
        .addEventListener('click', () => toggleCategoryForm(true));
    document
        .getElementById('cancelCategoryBtn')
        .addEventListener('click', () => toggleCategoryForm(false));
    document
        .getElementById('saveCategoryBtn')
        .addEventListener('click', saveCategory);

    // Hook up filter tabs
    document.querySelectorAll('.filter-tab').forEach((tab) => {
        tab.addEventListener('click', () =>
            handleFilterChange(tab.dataset.filter),
        );
    });

    // Handle Enter key in form
    document
        .getElementById('categoryName')
        .addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveCategory();
            }
        });

    // Add CSS for notifications
    const style = document.createElement('style');
    style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
    document.head.appendChild(style);
});
