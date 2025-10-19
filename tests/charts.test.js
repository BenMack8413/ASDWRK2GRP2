/**
 * @jest-environment jsdom
 */

const { loadCharts } = require('../frontend/scripts/chart'); // adjust path

describe('Charts frontend', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
        document.body.innerHTML = `
      <div id="chartsArea"></div>
    `;
    });

    it('should load and render chart correctly', async () => {
        const fakeChartConfig = {
            config_id: 1,
            budget_id: 1,
            name: 'Expenses by Category',
            type: 'pie',
            config_json: JSON.stringify({
                chartData: {
                    labels: ['Groceries', 'Transport'],
                    datasets: [{ label: 'Expenses', data: [200, 100] }],
                },
                startDate: '2025-10-01',
                endDate: '2025-10-02',
            }),
        };

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [fakeChartConfig],
        });

        await loadCharts(1);

        expect(fetch).toHaveBeenCalledWith('/api/charts/configs/1');

        const chartsArea = document.getElementById('chartsArea');

        // Should render 1 chart card
        expect(chartsArea.querySelectorAll('.chart-card').length).toBe(1);
        expect(chartsArea.querySelector('.chart-card h3').textContent).toBe(
            'Expenses by Category',
        );
    });
});
