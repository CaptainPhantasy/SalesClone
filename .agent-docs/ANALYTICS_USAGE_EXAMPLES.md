# AnalyticsAgent Usage Examples
**Created**: 2025-10-01T12:45:00Z

This document provides comprehensive examples of how to use the AnalyticsAgent for metrics tracking and reporting.

---

## Table of Contents
1. [Basic Setup](#basic-setup)
2. [Getting Call Status](#getting-call-status)
3. [Tracking Call Metrics](#tracking-call-metrics)
4. [Calculating Daily Analytics](#calculating-daily-analytics)
5. [Analyzing Sentiment Trends](#analyzing-sentiment-trends)
6. [Monitoring Escalation Rates](#monitoring-escalation-rates)
7. [Generating Daily Reports](#generating-daily-reports)
8. [Using MetricsService](#using-metricsservice)
9. [Exporting Data](#exporting-data)
10. [Error Handling](#error-handling)

---

## Basic Setup

```javascript
const AnalyticsAgent = require('./src/agents/AnalyticsAgent');
const DatabaseService = require('./src/services/DatabaseService');

// Create and initialize the analytics agent
const analyticsAgent = new AnalyticsAgent();
await analyticsAgent.initialize();

// Agent is now ready to use
console.log('AnalyticsAgent initialized and ready');
```

---

## Getting Call Status

### Example 1: Check Status of Active Call

```javascript
const result = await analyticsAgent.getCallStatus('CA123456789abcdef');

if (result.success) {
  console.log('Call Status:', result.data.status);
  console.log('Duration:', result.data.durationSeconds, 'seconds');
  console.log('Sentiment:', result.data.sentimentScore);
  console.log('Escalated:', result.data.escalated);
} else {
  console.error('Error:', result.error);
}
```

### Example 2: Monitor Multiple Calls

```javascript
const callSids = ['CA123456', 'CA789012', 'CA345678'];

for (const callSid of callSids) {
  const result = await analyticsAgent.getCallStatus(callSid);

  if (result.success && result.data) {
    console.log(`Call ${callSid}:`);
    console.log(`  Status: ${result.data.status}`);
    console.log(`  Started: ${result.data.startedAt}`);
    console.log(`  Duration: ${result.data.durationSeconds || 'N/A'} seconds`);
  }
}
```

---

## Tracking Call Metrics

### Example 1: Track Completed Call

```javascript
const callMetrics = {
  callSid: 'CA123456789',
  phoneNumber: '+1234567890',
  durationSeconds: 245,
  sentimentScore: 0.75,
  escalated: false,
  status: 'ended'
};

const result = await analyticsAgent.trackCallMetrics(callMetrics);

if (result.success) {
  console.log('Metrics tracked successfully');
  console.log('Tracked data:', result.data);
}
```

### Example 2: Batch Track Multiple Calls

```javascript
const completedCalls = [
  { callSid: 'CA001', phoneNumber: '+1111111111', durationSeconds: 120 },
  { callSid: 'CA002', phoneNumber: '+1222222222', durationSeconds: 180 },
  { callSid: 'CA003', phoneNumber: '+1333333333', durationSeconds: 90 }
];

for (const call of completedCalls) {
  const result = await analyticsAgent.trackCallMetrics(call);
  console.log(`Call ${call.callSid}: ${result.success ? 'tracked' : 'failed'}`);
}
```

---

## Calculating Daily Analytics

### Example 1: Calculate Today's Analytics

```javascript
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

const result = await analyticsAgent.calculateDailyAnalytics(today);

if (result.success) {
  const analytics = result.data;

  console.log('=== Daily Analytics ===');
  console.log(`Date: ${analytics.date}`);
  console.log(`Total Calls: ${analytics.total_calls}`);
  console.log(`Successful: ${analytics.successful_resolutions}`);
  console.log(`Escalations: ${analytics.escalations}`);
  console.log(`Unique Callers: ${analytics.unique_callers}`);
  console.log(`Avg Duration: ${Math.round(analytics.avg_duration_seconds)}s`);
  console.log(`Avg Sentiment: ${analytics.avg_sentiment.toFixed(2)}`);
  console.log(`Success Rate: ${analytics.metadata.success_rate.toFixed(1)}%`);
  console.log(`Escalation Rate: ${analytics.metadata.escalation_rate.toFixed(1)}%`);
}
```

### Example 2: Calculate Analytics for Date Range

```javascript
const startDate = new Date('2025-10-01');
const endDate = new Date('2025-10-07');

const results = [];

for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  const dateStr = d.toISOString().split('T')[0];
  const result = await analyticsAgent.calculateDailyAnalytics(dateStr);

  if (result.success) {
    results.push(result.data);
  }
}

console.log(`Calculated analytics for ${results.length} days`);
```

---

## Analyzing Sentiment Trends

### Example 1: Weekly Sentiment Trend

```javascript
const endDate = new Date().toISOString().split('T')[0];
const startDate = new Date();
startDate.setDate(startDate.getDate() - 7);
const startDateStr = startDate.toISOString().split('T')[0];

const result = await analyticsAgent.getSentimentTrends(startDateStr, endDate);

if (result.success) {
  const trends = result.data;

  console.log('=== Sentiment Trends (Last 7 Days) ===');
  console.log(`Average Sentiment: ${trends.averageSentiment}`);
  console.log(`Trend Direction: ${trends.trend}`);
  console.log(`Trend Strength: ${trends.trendStrength}`);
  console.log(`Summary: ${trends.summary}`);

  console.log('\nDaily Breakdown:');
  trends.dataPoints.forEach(point => {
    console.log(`  ${point.date}: ${point.value.toFixed(2)}`);
  });
}
```

### Example 2: Monthly Sentiment Analysis

```javascript
const result = await analyticsAgent.getSentimentTrends('2025-10-01', '2025-10-31');

if (result.success) {
  const trends = result.data;

  // Identify best and worst days
  const sortedPoints = [...trends.dataPoints].sort((a, b) => b.value - a.value);
  const bestDay = sortedPoints[0];
  const worstDay = sortedPoints[sortedPoints.length - 1];

  console.log('=== Monthly Sentiment Analysis ===');
  console.log(`Best Day: ${bestDay.date} (${bestDay.value.toFixed(2)})`);
  console.log(`Worst Day: ${worstDay.date} (${worstDay.value.toFixed(2)})`);
  console.log(`Overall Trend: ${trends.trend}`);

  // Alert if declining
  if (trends.trend === 'declining' && trends.trendStrength > 0.5) {
    console.warn('⚠️  ALERT: Strong negative sentiment trend detected!');
  }
}
```

---

## Monitoring Escalation Rates

### Example 1: Weekly Escalation Report

```javascript
const result = await analyticsAgent.getEscalationRate('2025-10-01', '2025-10-07');

if (result.success) {
  const escalation = result.data;

  console.log('=== Weekly Escalation Report ===');
  console.log(`Period: ${escalation.startDate} to ${escalation.endDate}`);
  console.log(`Total Calls: ${escalation.totalCalls}`);
  console.log(`Total Escalations: ${escalation.totalEscalations}`);
  console.log(`Escalation Rate: ${escalation.escalationRate}%`);

  console.log('\nDaily Breakdown:');
  escalation.dailyBreakdown.forEach(day => {
    console.log(`  ${day.date}: ${day.escalations}/${day.totalCalls} (${day.escalationRate}%)`);
  });

  // Performance evaluation
  if (escalation.escalationRate < 10) {
    console.log('✅ Excellent performance - Very low escalation rate');
  } else if (escalation.escalationRate < 20) {
    console.log('👍 Good performance - Escalation rate within acceptable range');
  } else if (escalation.escalationRate < 30) {
    console.log('⚠️  Warning - Escalation rate higher than ideal');
  } else {
    console.log('🚨 Critical - High escalation rate requires immediate attention');
  }
}
```

### Example 2: Find Highest Escalation Days

```javascript
const result = await analyticsAgent.getEscalationRate('2025-10-01', '2025-10-31');

if (result.success) {
  const escalation = result.data;

  // Sort by escalation rate
  const sorted = [...escalation.dailyBreakdown]
    .filter(day => day.totalCalls > 0)
    .sort((a, b) => b.escalationRate - a.escalationRate);

  console.log('=== Top 5 Days with Highest Escalation ===');
  sorted.slice(0, 5).forEach((day, index) => {
    console.log(`${index + 1}. ${day.date}: ${day.escalationRate}% (${day.escalations}/${day.totalCalls})`);
  });
}
```

---

## Generating Daily Reports

### Example 1: Generate and Display Daily Report

```javascript
const result = await analyticsAgent.generateDailyReport();

if (result.success) {
  const report = result.data;

  console.log('=== Daily Report ===');
  console.log(`Generated at: ${report.generatedAt}`);
  console.log('\n' + report.summary);

  // Additional analysis
  if (report.metrics.total_calls === 0) {
    console.log('\n⚠️  No calls received today - check system status');
  } else if (report.metrics.avg_sentiment < 0) {
    console.log('\n🚨 Negative sentiment detected - review conversations');
  }
}
```

### Example 2: Email Daily Report

```javascript
const result = await analyticsAgent.generateDailyReport();

if (result.success) {
  const report = result.data;

  // Format for email
  const emailBody = `
    Daily Analytics Report
    Date: ${report.date}

    Key Metrics:
    - Total Calls: ${report.metrics.total_calls}
    - Success Rate: ${report.metrics.metadata.success_rate.toFixed(1)}%
    - Average Sentiment: ${report.metrics.avg_sentiment.toFixed(2)}

    Insights:
    ${report.insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

    Full Summary:
    ${report.summary}
  `;

  // Send email (pseudo-code)
  // await emailService.send({
  //   to: 'team@example.com',
  //   subject: `Daily Analytics - ${report.date}`,
  //   body: emailBody
  // });

  console.log('Daily report ready for email');
}
```

### Example 3: Save Daily Report to File

```javascript
const fs = require('fs').promises;

const result = await analyticsAgent.generateDailyReport();

if (result.success) {
  const report = result.data;
  const filename = `daily-report-${report.date}.json`;

  await fs.writeFile(filename, JSON.stringify(report, null, 2));
  console.log(`Report saved to ${filename}`);

  // Also save as text summary
  const textFilename = `daily-report-${report.date}.txt`;
  await fs.writeFile(textFilename, report.summary);
  console.log(`Summary saved to ${textFilename}`);
}
```

---

## Using MetricsService

### Example 1: Calculate Metrics from Raw Data

```javascript
const MetricsService = require('./src/services/MetricsService');
const metricsService = new MetricsService();

const calls = [
  { duration_seconds: 120, sentiment_score: 0.8, escalated: false, status: 'ended' },
  { duration_seconds: 180, sentiment_score: 0.6, escalated: false, status: 'ended' },
  { duration_seconds: 90, sentiment_score: -0.2, escalated: true, status: 'escalated' }
];

const avgDuration = metricsService.calculateAverageDuration(calls);
const avgSentiment = metricsService.calculateAverageSentiment(calls);
const successRate = metricsService.calculateSuccessRate(calls);
const escalationRate = metricsService.calculateEscalationRate(calls);

console.log('=== Metrics Calculated ===');
console.log(`Average Duration: ${avgDuration}s`);
console.log(`Average Sentiment: ${avgSentiment}`);
console.log(`Success Rate: ${successRate}%`);
console.log(`Escalation Rate: ${escalationRate}%`);
```

### Example 2: Identify Trends

```javascript
const dataPoints = [
  { date: '2025-10-01', value: 0.5 },
  { date: '2025-10-02', value: 0.6 },
  { date: '2025-10-03', value: 0.7 },
  { date: '2025-10-04', value: 0.75 },
  { date: '2025-10-05', value: 0.8 }
];

const trends = metricsService.identifyTrends(dataPoints);

console.log('=== Trend Analysis ===');
console.log(`Direction: ${trends.direction}`);
console.log(`Strength: ${trends.strength}`);
console.log(`Summary: ${trends.summary}`);
```

---

## Exporting Data

### Example 1: Export to JSON

```javascript
const MetricsService = require('./src/services/MetricsService');
const metricsService = new MetricsService();
const fs = require('fs').promises;

// Get analytics data
const result = await analyticsAgent.calculateDailyAnalytics('2025-10-01');

if (result.success) {
  const json = metricsService.exportToJSON(result.data);
  await fs.writeFile('analytics-2025-10-01.json', json);
  console.log('Analytics exported to JSON');
}
```

### Example 2: Export to CSV

```javascript
// Get multiple days of analytics
const startDate = new Date('2025-10-01');
const endDate = new Date('2025-10-07');
const metricsArray = [];

for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  const dateStr = d.toISOString().split('T')[0];
  const result = await analyticsAgent.calculateDailyAnalytics(dateStr);

  if (result.success) {
    metricsArray.push(result.data);
  }
}

// Export to CSV
const MetricsService = require('./src/services/MetricsService');
const metricsService = new MetricsService();
const csv = metricsService.exportToCSV(metricsArray);

await fs.writeFile('analytics-week.csv', csv);
console.log('Analytics exported to CSV');
```

---

## Error Handling

### Example 1: Graceful Error Handling

```javascript
async function safeGetCallStatus(callSid) {
  try {
    const result = await analyticsAgent.getCallStatus(callSid);

    if (!result.success) {
      console.error(`Failed to get call status: ${result.error}`);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Unexpected error:', error);
    return null;
  }
}

const status = await safeGetCallStatus('CA123456');
if (status) {
  console.log('Call status retrieved:', status);
}
```

### Example 2: Retry Logic

```javascript
async function calculateDailyAnalyticsWithRetry(date, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await analyticsAgent.calculateDailyAnalytics(date);

      if (result.success) {
        return result.data;
      }

      console.warn(`Attempt ${attempt} failed: ${result.error}`);

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    } catch (error) {
      console.error(`Attempt ${attempt} error:`, error);

      if (attempt >= maxRetries) {
        throw error;
      }
    }
  }

  throw new Error('Failed after maximum retries');
}

try {
  const analytics = await calculateDailyAnalyticsWithRetry('2025-10-01');
  console.log('Analytics calculated:', analytics);
} catch (error) {
  console.error('Failed to calculate analytics:', error);
}
```

### Example 3: Validation Before API Calls

```javascript
function validateDateFormat(date) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(date);
}

async function safeSentimentTrends(startDate, endDate) {
  // Validate date formats
  if (!validateDateFormat(startDate) || !validateDateFormat(endDate)) {
    console.error('Invalid date format. Use YYYY-MM-DD');
    return null;
  }

  // Validate date range
  if (new Date(startDate) > new Date(endDate)) {
    console.error('Start date must be before end date');
    return null;
  }

  const result = await analyticsAgent.getSentimentTrends(startDate, endDate);

  if (!result.success) {
    console.error('Failed to get sentiment trends:', result.error);
    return null;
  }

  return result.data;
}

const trends = await safeSentimentTrends('2025-10-01', '2025-10-07');
if (trends) {
  console.log('Sentiment trends:', trends);
}
```

---

## Complete Integration Example

```javascript
const AnalyticsAgent = require('./src/agents/AnalyticsAgent');
const fs = require('fs').promises;

// Main analytics workflow
async function runDailyAnalytics() {
  console.log('Starting daily analytics workflow...');

  // Initialize agent
  const analyticsAgent = new AnalyticsAgent();
  await analyticsAgent.initialize();

  // Check health
  const health = await analyticsAgent.healthCheck();
  if (!health.healthy) {
    console.error('Health check failed:', health);
    return;
  }

  // Generate daily report
  const reportResult = await analyticsAgent.generateDailyReport();
  if (!reportResult.success) {
    console.error('Failed to generate report:', reportResult.error);
    return;
  }

  const report = reportResult.data;

  // Display summary
  console.log('\n' + report.summary);

  // Save to file
  const filename = `report-${report.date}.json`;
  await fs.writeFile(filename, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to ${filename}`);

  // Check for alerts
  if (report.metrics.avg_sentiment < 0) {
    console.warn('\n🚨 ALERT: Negative sentiment detected!');
  }

  if (report.metrics.metadata.escalation_rate > 30) {
    console.warn('\n🚨 ALERT: High escalation rate!');
  }

  // Shutdown gracefully
  await analyticsAgent.shutdown();

  console.log('\nAnalytics workflow completed successfully');
}

// Run the workflow
runDailyAnalytics().catch(error => {
  console.error('Workflow failed:', error);
  process.exit(1);
});
```

---

## Best Practices

1. **Always initialize the agent** before use
2. **Check health** before critical operations
3. **Handle errors gracefully** with proper logging
4. **Validate input parameters** before making API calls
5. **Use appropriate date formats** (YYYY-MM-DD)
6. **Store reports** for historical analysis
7. **Monitor trends regularly** to identify issues early
8. **Set up alerts** for critical thresholds
9. **Export data regularly** for backup and analysis
10. **Shutdown gracefully** to clean up resources

---

## Troubleshooting

### Issue: "Invalid date format" error
**Solution**: Ensure dates are in YYYY-MM-DD format
```javascript
const date = new Date().toISOString().split('T')[0]; // Correct format
```

### Issue: "Conversation not found" error
**Solution**: Verify the call SID exists in the database
```javascript
const result = await analyticsAgent.getCallStatus(callSid);
if (!result.success && result.error.includes('not found')) {
  console.log('Call does not exist yet');
}
```

### Issue: Low test coverage warning
**Solution**: This is expected - overall project coverage is low because only AnalyticsAgent tests are running. When all agent tests are added, coverage will improve.

### Issue: Zero metrics calculated
**Solution**: Ensure there are conversations in the database for the specified date
```javascript
const result = await analyticsAgent.calculateDailyAnalytics(date);
if (result.success && result.data.total_calls === 0) {
  console.log('No calls found for this date');
}
```

---

For more information, see:
- `/src/agents/AnalyticsAgent.js` - Full implementation
- `/src/services/MetricsService.js` - Metrics calculations
- `/__tests__/AnalyticsAgent.test.js` - Test suite
- `/.agent-docs/SHARED_INTERFACES.md` - Type definitions
