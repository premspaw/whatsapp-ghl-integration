// WhatsApp AI Chatbot Analytics Dashboard
document.addEventListener('DOMContentLoaded', function() {
  // Initialize charts
  initCharts();
  
  // Load initial data
  loadDashboardData();
  
  // Set up refresh interval (every 5 minutes)
  setInterval(loadDashboardData, 5 * 60 * 1000);
  
  // Set up event listeners
  document.getElementById('dateRangeSelector').addEventListener('change', loadDashboardData);
  document.getElementById('refreshButton').addEventListener('click', loadDashboardData);
});

// Initialize chart objects
let conversationChart, responseTimeChart, accuracyChart;

function initCharts() {
  // Conversation volume chart
  const conversationCtx = document.getElementById('conversationChart').getContext('2d');
  conversationChart = new Chart(conversationCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Total Conversations',
        data: [],
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Conversation Volume'
        }
      }
    }
  });
  
  // Response time chart
  const responseTimeCtx = document.getElementById('responseTimeChart').getContext('2d');
  responseTimeChart = new Chart(responseTimeCtx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Average Response Time (ms)',
        data: [],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Response Time'
        }
      }
    }
  });
  
  // Accuracy chart
  const accuracyCtx = document.getElementById('accuracyChart').getContext('2d');
  accuracyChart = new Chart(accuracyCtx, {
    type: 'doughnut',
    data: {
      labels: ['Accurate', 'Needs Improvement', 'Incorrect'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: [
          'rgba(75, 192, 192, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(255, 99, 132, 0.5)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Response Accuracy'
        }
      }
    }
  });
}

// Load dashboard data from API
async function loadDashboardData() {
  try {
    showLoadingIndicator(true);
    
    const dateRange = document.getElementById('dateRangeSelector').value;
    const response = await fetch(`/api/analytics/dashboard?range=${dateRange}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch analytics data');
    }
    
    const data = await response.json();
    
    // Update summary metrics
    updateSummaryMetrics(data.summary);
    
    // Update charts
    updateCharts(data);
    
    // Update conversation table
    updateConversationTable(data.recentConversations);
    
    // Update knowledge base stats
    updateKnowledgeBaseStats(data.knowledgeBase);
    
    showLoadingIndicator(false);
    showLastUpdated();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showErrorMessage('Failed to load analytics data. Please try again.');
    showLoadingIndicator(false);
  }
}

// Update summary metrics
function updateSummaryMetrics(summary) {
  document.getElementById('totalConversations').textContent = summary.totalConversations;
  document.getElementById('activeUsers').textContent = summary.activeUsers;
  document.getElementById('avgResponseTime').textContent = `${summary.avgResponseTime} ms`;
  document.getElementById('accuracyRate').textContent = `${summary.accuracyRate}%`;
  
  // Update AI handoff rate
  const handoffElement = document.getElementById('handoffRate');
  handoffElement.textContent = `${summary.handoffRate}%`;
  
  // Color coding based on handoff rate
  if (summary.handoffRate > 30) {
    handoffElement.classList.add('text-danger');
    handoffElement.classList.remove('text-success', 'text-warning');
  } else if (summary.handoffRate > 15) {
    handoffElement.classList.add('text-warning');
    handoffElement.classList.remove('text-success', 'text-danger');
  } else {
    handoffElement.classList.add('text-success');
    handoffElement.classList.remove('text-warning', 'text-danger');
  }
}

// Update all charts with new data
function updateCharts(data) {
  // Update conversation chart
  conversationChart.data.labels = data.conversationTrend.labels;
  conversationChart.data.datasets[0].data = data.conversationTrend.values;
  conversationChart.update();
  
  // Update response time chart
  responseTimeChart.data.labels = data.responseTimes.labels;
  responseTimeChart.data.datasets[0].data = data.responseTimes.values;
  responseTimeChart.update();
  
  // Update accuracy chart
  accuracyChart.data.datasets[0].data = [
    data.accuracy.accurate,
    data.accuracy.needsImprovement,
    data.accuracy.incorrect
  ];
  accuracyChart.update();
}

// Update recent conversations table
function updateConversationTable(conversations) {
  const tableBody = document.getElementById('conversationTableBody');
  tableBody.innerHTML = '';
  
  conversations.forEach(conv => {
    const row = document.createElement('tr');
    
    // Create timestamp cell
    const timestampCell = document.createElement('td');
    const timestamp = new Date(conv.timestamp);
    timestampCell.textContent = timestamp.toLocaleString();
    row.appendChild(timestampCell);
    
    // Create user cell
    const userCell = document.createElement('td');
    userCell.textContent = conv.user;
    row.appendChild(userCell);
    
    // Create query cell
    const queryCell = document.createElement('td');
    queryCell.textContent = conv.query;
    row.appendChild(queryCell);
    
    // Create response cell
    const responseCell = document.createElement('td');
    responseCell.textContent = conv.response;
    row.appendChild(responseCell);
    
    // Create accuracy cell with badge
    const accuracyCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.classList.add('badge');
    
    if (conv.accuracy === 'accurate') {
      badge.classList.add('bg-success');
      badge.textContent = 'Accurate';
    } else if (conv.accuracy === 'needs_improvement') {
      badge.classList.add('bg-warning');
      badge.textContent = 'Needs Improvement';
    } else {
      badge.classList.add('bg-danger');
      badge.textContent = 'Incorrect';
    }
    
    accuracyCell.appendChild(badge);
    row.appendChild(accuracyCell);
    
    tableBody.appendChild(row);
  });
}

// Update knowledge base statistics
function updateKnowledgeBaseStats(knowledgeBase) {
  document.getElementById('totalDocuments').textContent = knowledgeBase.totalDocuments;
  document.getElementById('totalWebsites').textContent = knowledgeBase.totalWebsites;
  document.getElementById('totalEmbeddings').textContent = knowledgeBase.totalEmbeddings;
  
  // Update knowledge base usage chart if available
  if (window.knowledgeBaseChart && knowledgeBase.usage) {
    window.knowledgeBaseChart.data.labels = knowledgeBase.usage.labels;
    window.knowledgeBaseChart.data.datasets[0].data = knowledgeBase.usage.values;
    window.knowledgeBaseChart.update();
  }
}

// Helper functions
function showLoadingIndicator(isLoading) {
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (isLoading) {
    loadingIndicator.classList.remove('d-none');
  } else {
    loadingIndicator.classList.add('d-none');
  }
}

function showErrorMessage(message) {
  const alertElement = document.getElementById('errorAlert');
  alertElement.textContent = message;
  alertElement.classList.remove('d-none');
  
  // Hide after 5 seconds
  setTimeout(() => {
    alertElement.classList.add('d-none');
  }, 5000);
}

function showLastUpdated() {
  const now = new Date();
  document.getElementById('lastUpdated').textContent = now.toLocaleString();
}