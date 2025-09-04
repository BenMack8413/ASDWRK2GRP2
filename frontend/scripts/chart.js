document.addEventListener('DOMContentLoaded', () => {
    const transactions = [
        { date: '2025-08-01', category: 'Food', amount: 25.5 },
        { date: '2025-08-02', category: 'Transport', amount: 10.0 },
        { date: '2025-08-02', category: 'Entertainment', amount: 40.0 },
    ];

    // Sum expenses by category
    const categoryTotals = {};
    transactions.forEach((t) => {
        categoryTotals[t.category] =
            (categoryTotals[t.category] || 0) + t.amount;
    });

    // Get canvas context
    const ctx = document.getElementById('expensesChart').getContext('2d');

    // Create pie chart
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categoryTotals),
            datasets: [
                {
                    label: 'Expenses',
                    data: Object.values(categoryTotals),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                },
            },
        },
    });
});
