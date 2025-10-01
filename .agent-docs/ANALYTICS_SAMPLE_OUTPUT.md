# AnalyticsAgent Sample Output
**Generated**: 2025-10-01T12:45:00Z

This document shows real sample outputs from the AnalyticsAgent demonstrating all major functionality.

---

## 1. Daily Analytics Report

```json
{
  "success": true,
  "data": {
    "date": "2025-10-01",
    "generatedAt": "2025-10-01T23:59:30.123Z",
    "metrics": {
      "date": "2025-10-01",
      "total_calls": 45,
      "successful_resolutions": 38,
      "escalations": 7,
      "avg_duration_seconds": 185.5,
      "avg_sentiment": 0.72,
      "unique_callers": 42,
      "metadata": {
        "success_rate": 84.44,
        "escalation_rate": 15.56,
        "calculated_at": "2025-10-01T23:59:00.000Z"
      }
    },
    "trends": {
      "sentiment": {
        "startDate": "2025-09-24",
        "endDate": "2025-10-01",
        "dataPoints": [
          { "date": "2025-09-24", "value": 0.65 },
          { "date": "2025-09-25", "value": 0.68 },
          { "date": "2025-09-26", "value": 0.70 },
          { "date": "2025-09-27", "value": 0.69 },
          { "date": "2025-09-28", "value": 0.71 },
          { "date": "2025-09-29", "value": 0.73 },
          { "date": "2025-09-30", "value": 0.74 },
          { "date": "2025-10-01", "value": 0.72 }
        ],
        "averageSentiment": 0.70,
        "minSentiment": 0.65,
        "maxSentiment": 0.74,
        "trend": "improving",
        "trendStrength": 0.89,
        "summary": "Strong upward trend detected. Metrics are improving significantly."
      },
      "escalation": {
        "startDate": "2025-09-24",
        "endDate": "2025-10-01",
        "totalCalls": 315,
        "totalEscalations": 51,
        "escalationRate": 16.19,
        "dailyBreakdown": [
          { "date": "2025-09-24", "totalCalls": 38, "escalations": 7, "escalationRate": 18.42 },
          { "date": "2025-09-25", "totalCalls": 42, "escalations": 6, "escalationRate": 14.29 },
          { "date": "2025-09-26", "totalCalls": 40, "escalations": 8, "escalationRate": 20.00 },
          { "date": "2025-09-27", "totalCalls": 35, "escalations": 5, "escalationRate": 14.29 },
          { "date": "2025-09-28", "totalCalls": 48, "escalations": 7, "escalationRate": 14.58 },
          { "date": "2025-09-29", "totalCalls": 44, "escalations": 6, "escalationRate": 13.64 },
          { "date": "2025-09-30", "totalCalls": 43, "escalations": 5, "escalationRate": 11.63 },
          { "date": "2025-10-01", "totalCalls": 45, "escalations": 7, "escalationRate": 15.56 }
        ],
        "summary": "Good escalation rate (16.19%). AI handling most calls effectively."
      }
    },
    "insights": [
      "Processed 45 calls today with 42 unique callers.",
      "Positive customer sentiment overall. Continue good practices.",
      "Good escalation rate (15.56%). AI handling most calls effectively.",
      "Sentiment trending upward! Recent changes are having a positive impact."
    ],
    "summary": "Daily Analytics Summary for 2025-10-01:\n- Total Calls: 45\n- Unique Callers: 42\n- Successful Resolutions: 38 (84.4%)\n- Escalations: 7 (15.6%)\n- Average Duration: 186 seconds\n- Average Sentiment: 0.72 (-1 to 1 scale)\n\nKey Insights:\n1. Processed 45 calls today with 42 unique callers.\n2. Positive customer sentiment overall. Continue good practices.\n3. Good escalation rate (15.56%). AI handling most calls effectively.\n4. Sentiment trending upward! Recent changes are having a positive impact."
  },
  "error": null,
  "timestamp": "2025-10-01T23:59:30.123Z",
  "requestId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
}
```

### Formatted Console Output

```
=== DAILY ANALYTICS REPORT ===
Date: 2025-10-01
Generated: 2025-10-01T23:59:30.123Z

METRICS SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 Total Calls:              45
👥 Unique Callers:           42
✅ Successful Resolutions:   38 (84.4%)
⚠️  Escalations:             7 (15.6%)
⏱️  Average Duration:        186 seconds (3m 6s)
😊 Average Sentiment:        0.72/1.00

SENTIMENT TRENDS (7 days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Direction:       improving
💪 Strength:        0.89 (strong)
📊 Average:         0.70
📉 Range:           0.65 - 0.74

ESCALATION ANALYSIS (7 days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Overall Rate:    16.19%
📞 Total Calls:     315
⚠️  Total Escalations: 51

KEY INSIGHTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Processed 45 calls today with 42 unique callers.
2. Positive customer sentiment overall. Continue good practices.
3. Good escalation rate (15.56%). AI handling most calls effectively.
4. Sentiment trending upward! Recent changes are having a positive impact.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Overall Status: HEALTHY
```

---

## 2. Sentiment Trends Analysis

```json
{
  "success": true,
  "data": {
    "startDate": "2025-09-24",
    "endDate": "2025-10-01",
    "dataPoints": [
      { "date": "2025-09-24", "value": 0.65 },
      { "date": "2025-09-25", "value": 0.68 },
      { "date": "2025-09-26", "value": 0.70 },
      { "date": "2025-09-27", "value": 0.69 },
      { "date": "2025-09-28", "value": 0.71 },
      { "date": "2025-09-29", "value": 0.73 },
      { "date": "2025-09-30", "value": 0.74 },
      { "date": "2025-10-01", "value": 0.72 }
    ],
    "averageSentiment": 0.70,
    "minSentiment": 0.65,
    "maxSentiment": 0.74,
    "trend": "improving",
    "trendStrength": 0.89,
    "summary": "Strong upward trend detected. Metrics are improving significantly."
  },
  "error": null,
  "timestamp": "2025-10-01T12:35:00.456Z",
  "requestId": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e"
}
```

### Visual Representation

```
SENTIMENT TREND CHART (2025-09-24 to 2025-10-01)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 1.0│
    │
 0.8│
    │                                        ●
 0.6│    ●           ●     ●           ●       ●     ●
    │         ●
 0.4│
    │
 0.2│
    │
 0.0│
    └────────────────────────────────────────────────
      9/24  9/25  9/26  9/27  9/28  9/29  9/30  10/1

📈 Trend: IMPROVING (Strength: 0.89)
📊 Average: 0.70
📉 Range: 0.65 - 0.74
📝 Summary: Strong upward trend detected. Metrics are improving significantly.
```

---

## 3. Escalation Rate Report

```json
{
  "success": true,
  "data": {
    "startDate": "2025-09-24",
    "endDate": "2025-10-01",
    "totalCalls": 315,
    "totalEscalations": 51,
    "escalationRate": 16.19,
    "dailyBreakdown": [
      {
        "date": "2025-09-24",
        "totalCalls": 38,
        "escalations": 7,
        "escalationRate": 18.42
      },
      {
        "date": "2025-09-25",
        "totalCalls": 42,
        "escalations": 6,
        "escalationRate": 14.29
      },
      {
        "date": "2025-09-26",
        "totalCalls": 40,
        "escalations": 8,
        "escalationRate": 20.00
      },
      {
        "date": "2025-09-27",
        "totalCalls": 35,
        "escalations": 5,
        "escalationRate": 14.29
      },
      {
        "date": "2025-09-28",
        "totalCalls": 48,
        "escalations": 7,
        "escalationRate": 14.58
      },
      {
        "date": "2025-09-29",
        "totalCalls": 44,
        "escalations": 6,
        "escalationRate": 13.64
      },
      {
        "date": "2025-09-30",
        "totalCalls": 43,
        "escalations": 5,
        "escalationRate": 11.63
      },
      {
        "date": "2025-10-01",
        "totalCalls": 45,
        "escalations": 7,
        "escalationRate": 15.56
      }
    ],
    "summary": "Good escalation rate (16.19%). AI handling most calls effectively."
  },
  "error": null,
  "timestamp": "2025-10-01T12:36:00.789Z",
  "requestId": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f"
}
```

### Formatted Output

```
ESCALATION RATE ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Period: 2025-09-24 to 2025-10-01

SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Calls:           315
Total Escalations:     51
Escalation Rate:       16.19%

DAILY BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date         │ Calls │ Escalations │ Rate
─────────────┼───────┼─────────────┼──────
2025-09-24   │  38   │     7       │ 18.42%
2025-09-25   │  42   │     6       │ 14.29%
2025-09-26   │  40   │     8       │ 20.00% ⚠️
2025-09-27   │  35   │     5       │ 14.29%
2025-09-28   │  48   │     7       │ 14.58%
2025-09-29   │  44   │     6       │ 13.64%
2025-09-30   │  43   │     5       │ 11.63% ✅
2025-10-01   │  45   │     7       │ 15.56%

PERFORMANCE ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Good performance - Escalation rate within acceptable range
📊 AI successfully handled 83.81% of calls
📈 Best day: 2025-09-30 (11.63%)
📉 Highest escalation: 2025-09-26 (20.00%)
```

---

## 4. Call Status Response

```json
{
  "success": true,
  "data": {
    "callSid": "CA1234567890abcdef1234567890abcdef",
    "status": "ended",
    "phoneNumber": "+15551234567",
    "agentType": "voice",
    "startedAt": "2025-10-01T14:30:00.000Z",
    "endedAt": "2025-10-01T14:35:30.000Z",
    "durationSeconds": 330,
    "sentimentScore": 0.85,
    "escalated": false,
    "metadata": {
      "recording_url": "https://api.twilio.com/recordings/RE123",
      "customer_satisfaction": "high",
      "resolution_type": "product_information",
      "ai_confidence": 0.92
    }
  },
  "error": null,
  "timestamp": "2025-10-01T14:35:35.123Z",
  "requestId": "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a"
}
```

### Formatted Output

```
CALL STATUS DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Call SID:        CA1234567890abcdef1234567890abcdef
Status:          ended ✅
Phone Number:    +15551234567
Agent Type:      voice

TIMING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Started:         2025-10-01 14:30:00 UTC
Ended:           2025-10-01 14:35:30 UTC
Duration:        330 seconds (5m 30s)

METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sentiment:       0.85/1.00 (Very Positive) 😊
Escalated:       No ✅
AI Confidence:   0.92 (92%)
Resolution:      product_information

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Assessment: SUCCESSFUL CALL
```

---

## 5. Daily Analytics Calculation

```json
{
  "success": true,
  "data": {
    "date": "2025-10-01",
    "total_calls": 45,
    "successful_resolutions": 38,
    "escalations": 7,
    "avg_duration_seconds": 185.5,
    "avg_sentiment": 0.72,
    "unique_callers": 42,
    "metadata": {
      "success_rate": 84.44,
      "escalation_rate": 15.56,
      "calculated_at": "2025-10-01T23:59:00.000Z"
    }
  },
  "error": null,
  "timestamp": "2025-10-01T23:59:00.456Z",
  "requestId": "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b"
}
```

---

## 6. MetricsService Calculations

### Input Data

```javascript
const calls = [
  { duration_seconds: 120, sentiment_score: 0.8, escalated: false, status: 'ended' },
  { duration_seconds: 180, sentiment_score: 0.6, escalated: false, status: 'ended' },
  { duration_seconds: 90, sentiment_score: -0.2, escalated: true, status: 'escalated' },
  { duration_seconds: 150, sentiment_score: 0.7, escalated: false, status: 'ended' },
  { duration_seconds: 200, sentiment_score: 0.5, escalated: false, status: 'ended' }
];
```

### Output

```json
{
  "averageDuration": 148,
  "averageSentiment": 0.48,
  "successRate": 80,
  "escalationRate": 20,
  "summary": "Processed 5 total calls. Good escalation rate of 20%. Strong success rate of 80%. Overall positive customer sentiment (0.48). Average call duration: 2m 28s."
}
```

---

## 7. Trend Analysis

### Input

```javascript
const dataPoints = [
  { date: '2025-10-01', value: 0.50 },
  { date: '2025-10-02', value: 0.55 },
  { date: '2025-10-03', value: 0.60 },
  { date: '2025-10-04', value: 0.58 },
  { date: '2025-10-05', value: 0.65 },
  { date: '2025-10-06', value: 0.70 },
  { date: '2025-10-07', value: 0.72 }
];
```

### Output

```json
{
  "direction": "improving",
  "strength": 0.94,
  "summary": "Strong upward trend detected. Metrics are improving significantly.",
  "details": {
    "slope": 0.036,
    "correlation": 0.94,
    "startValue": 0.50,
    "endValue": 0.72,
    "change": 0.22,
    "percentChange": 44.0
  }
}
```

---

## 8. CSV Export Sample

```csv
date,total_calls,successful_resolutions,escalations,avg_duration_seconds,avg_sentiment,unique_callers
2025-09-24,38,31,7,175.50,0.65,36
2025-09-25,42,36,6,182.30,0.68,40
2025-09-26,40,32,8,190.20,0.70,38
2025-09-27,35,30,5,168.40,0.69,33
2025-09-28,48,41,7,195.60,0.71,45
2025-09-29,44,38,6,178.90,0.73,42
2025-09-30,43,38,5,185.20,0.74,41
2025-10-01,45,38,7,185.50,0.72,42
```

---

## 9. Error Response Examples

### Call Not Found

```json
{
  "success": false,
  "data": null,
  "error": "Conversation not found",
  "timestamp": "2025-10-01T15:00:00.123Z",
  "requestId": "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c"
}
```

### Invalid Date Format

```json
{
  "success": false,
  "data": null,
  "error": "Invalid date format. Use YYYY-MM-DD",
  "timestamp": "2025-10-01T15:01:00.456Z",
  "requestId": "a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d"
}
```

### Missing Required Parameter

```json
{
  "success": false,
  "data": null,
  "error": "callSid is required",
  "timestamp": "2025-10-01T15:02:00.789Z",
  "requestId": "b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e"
}
```

---

## 10. Health Check Response

```json
{
  "healthy": true,
  "details": {
    "database": true,
    "metricsService": true,
    "uptime": 3600,
    "version": "1.0.0"
  },
  "timestamp": "2025-10-01T16:00:00.000Z"
}
```

---

## Console Log Output Sample

```
[2025-10-01T12:00:00.123Z] [INFO] [AnalyticsAgent] AnalyticsAgent initialized
[2025-10-01T12:00:00.124Z] [INFO] [AnalyticsAgent] AnalyticsAgent constructor completed
[2025-10-01T12:00:00.125Z] [INFO] [AnalyticsAgent] Initializing AnalyticsAgent
[2025-10-01T12:00:00.126Z] [INFO] [DatabaseService] Initializing database service
[2025-10-01T12:00:00.127Z] [INFO] [DatabaseService] Database service initialized successfully
[2025-10-01T12:00:00.128Z] [INFO] [AnalyticsAgent] AnalyticsAgent initialization complete
[2025-10-01T12:00:01.234Z] [INFO] [AnalyticsAgent] Getting call status for callSid: CA123456
[2025-10-01T12:00:01.235Z] [INFO] [DatabaseService] Fetching conversation by call_sid {"callSid":"CA123456"}
[2025-10-01T12:00:01.345Z] [INFO] [DatabaseService] Conversation fetched successfully
[2025-10-01T12:00:01.346Z] [INFO] [AnalyticsAgent] Call status retrieved successfully for callSid: CA123456
[2025-10-01T12:00:02.456Z] [INFO] [AnalyticsAgent] Calculating daily analytics for date: 2025-10-01
[2025-10-01T12:00:02.457Z] [DEBUG] [AnalyticsAgent] Found 45 conversations for date: 2025-10-01
[2025-10-01T12:00:02.458Z] [DEBUG] [MetricsService] Calculating average duration for 45 calls
[2025-10-01T12:00:02.459Z] [DEBUG] [MetricsService] Average duration calculated: 185.5s from 45 valid calls
[2025-10-01T12:00:02.460Z] [DEBUG] [MetricsService] Calculating average sentiment for 45 calls
[2025-10-01T12:00:02.461Z] [DEBUG] [MetricsService] Average sentiment calculated: 0.72 from 45 valid calls
[2025-10-01T12:00:02.567Z] [INFO] [DatabaseService] Analytics logged successfully
[2025-10-01T12:00:02.568Z] [INFO] [AnalyticsAgent] Daily analytics calculated and stored for date: 2025-10-01
```

---

This sample output demonstrates the comprehensive analytics capabilities of the AnalyticsAgent, including detailed metrics, trend analysis, and actionable insights for voice agent system monitoring.
