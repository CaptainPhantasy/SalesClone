/**
 * @fileoverview Metrics calculation service for analytics processing
 * @author LegacyAI Analytics Agent
 * @created 2025-10-01T12:00:00Z
 * @lastModified 2025-10-01T12:00:00Z
 *
 * This service provides comprehensive metrics calculation functionality:
 * - Duration calculations and aggregations
 * - Sentiment analysis and averaging
 * - Success rate calculations
 * - Escalation rate tracking
 * - Trend identification and analysis
 * - Summary and insight generation
 * - Export capabilities (JSON/CSV)
 */

/**
 * MetricsService class for calculating and analyzing metrics
 * All methods are stateless and can be used independently
 *
 * @class MetricsService
 * @created 2025-10-01T12:00:00Z
 * @lastModified 2025-10-01T12:00:00Z
 */
class MetricsService {
  /**
   * Initialize MetricsService
   *
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  constructor() {
    console.log(`[${new Date().toISOString()}] [INFO] [MetricsService] MetricsService initialized`);
  }

  /**
   * Calculate average call duration from an array of conversations
   * Filters out conversations without duration data
   *
   * @param {Array<Object>} calls - Array of conversation objects
   * @param {number} calls[].duration_seconds - Call duration in seconds
   * @returns {number} Average duration in seconds (rounded to 2 decimals)
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const calls = [
   *   { duration_seconds: 120 },
   *   { duration_seconds: 180 },
   *   { duration_seconds: 90 }
   * ];
   * const avg = metricsService.calculateAverageDuration(calls);
   * // Returns: 130
   */
  calculateAverageDuration(calls) {
    try {
      console.log(`[${new Date().toISOString()}] [DEBUG] [MetricsService] Calculating average duration for ${calls.length} calls`);

      // Validate input
      if (!Array.isArray(calls) || calls.length === 0) {
        console.log(`[${new Date().toISOString()}] [WARN] [MetricsService] No calls provided for duration calculation`);
        return 0;
      }

      // Filter calls with valid duration data
      // Some calls may not have duration_seconds if they're still active or failed to connect
      const validDurations = calls
        .map(call => call.duration_seconds)
        .filter(duration => typeof duration === 'number' && duration > 0);

      if (validDurations.length === 0) {
        console.log(`[${new Date().toISOString()}] [WARN] [MetricsService] No valid durations found`);
        return 0;
      }

      // Calculate average by summing all durations and dividing by count
      const sum = validDurations.reduce((total, duration) => total + duration, 0);
      const average = sum / validDurations.length;

      const result = Number(average.toFixed(2));

      console.log(`[${new Date().toISOString()}] [DEBUG] [MetricsService] Average duration calculated: ${result}s from ${validDurations.length} valid calls`);

      return result;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [MetricsService] Error calculating average duration`, error);
      return 0;
    }
  }

  /**
   * Calculate average sentiment score from an array of conversations
   * Sentiment scores range from -1 (negative) to +1 (positive)
   *
   * @param {Array<Object>} calls - Array of conversation objects
   * @param {number} calls[].sentiment_score - Sentiment score (-1 to 1)
   * @returns {number} Average sentiment score (rounded to 2 decimals)
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const calls = [
   *   { sentiment_score: 0.8 },
   *   { sentiment_score: 0.6 },
   *   { sentiment_score: -0.2 }
   * ];
   * const avg = metricsService.calculateAverageSentiment(calls);
   * // Returns: 0.40
   */
  calculateAverageSentiment(calls) {
    try {
      console.log(`[${new Date().toISOString()}] [DEBUG] [MetricsService] Calculating average sentiment for ${calls.length} calls`);

      // Validate input
      if (!Array.isArray(calls) || calls.length === 0) {
        console.log(`[${new Date().toISOString()}] [WARN] [MetricsService] No calls provided for sentiment calculation`);
        return 0;
      }

      // Filter calls with valid sentiment scores
      // Sentiment scores should be between -1 and 1
      const validSentiments = calls
        .map(call => call.sentiment_score)
        .filter(sentiment => {
          return typeof sentiment === 'number' &&
                 sentiment >= -1 &&
                 sentiment <= 1;
        });

      if (validSentiments.length === 0) {
        console.log(`[${new Date().toISOString()}] [WARN] [MetricsService] No valid sentiment scores found`);
        return 0;
      }

      // Calculate average sentiment
      const sum = validSentiments.reduce((total, sentiment) => total + sentiment, 0);
      const average = sum / validSentiments.length;

      const result = Number(average.toFixed(2));

      console.log(`[${new Date().toISOString()}] [DEBUG] [MetricsService] Average sentiment calculated: ${result} from ${validSentiments.length} valid calls`);

      return result;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [MetricsService] Error calculating average sentiment`, error);
      return 0;
    }
  }

  /**
   * Calculate success rate (percentage of calls that completed without escalation)
   * Success is defined as a call that ended without being escalated to a human
   *
   * @param {Array<Object>} calls - Array of conversation objects
   * @param {boolean} calls[].escalated - Whether call was escalated
   * @param {string} calls[].status - Call status ('active', 'ended', 'escalated')
   * @returns {number} Success rate as percentage (0-100, rounded to 2 decimals)
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const calls = [
   *   { escalated: false, status: 'ended' },
   *   { escalated: false, status: 'ended' },
   *   { escalated: true, status: 'escalated' }
   * ];
   * const rate = metricsService.calculateSuccessRate(calls);
   * // Returns: 66.67
   */
  calculateSuccessRate(calls) {
    try {
      console.log(`[${new Date().toISOString()}] [DEBUG] [MetricsService] Calculating success rate for ${calls.length} calls`);

      // Validate input
      if (!Array.isArray(calls) || calls.length === 0) {
        console.log(`[${new Date().toISOString()}] [WARN] [MetricsService] No calls provided for success rate calculation`);
        return 0;
      }

      // Count successful calls (not escalated)
      // Only consider completed calls (not still active)
      const completedCalls = calls.filter(call => call.status !== 'active');
      const successfulCalls = completedCalls.filter(call => !call.escalated);

      if (completedCalls.length === 0) {
        console.log(`[${new Date().toISOString()}] [WARN] [MetricsService] No completed calls found`);
        return 0;
      }

      // Calculate success rate as percentage
      const successRate = (successfulCalls.length / completedCalls.length) * 100;
      const result = Number(successRate.toFixed(2));

      console.log(`[${new Date().toISOString()}] [DEBUG] [MetricsService] Success rate calculated: ${result}% (${successfulCalls.length}/${completedCalls.length} calls)`);

      return result;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [MetricsService] Error calculating success rate`, error);
      return 0;
    }
  }

  /**
   * Calculate escalation rate (percentage of calls escalated to human agents)
   * Inverse of success rate
   *
   * @param {Array<Object>} calls - Array of conversation objects
   * @param {boolean} calls[].escalated - Whether call was escalated
   * @param {string} calls[].status - Call status
   * @returns {number} Escalation rate as percentage (0-100, rounded to 2 decimals)
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const calls = [
   *   { escalated: false, status: 'ended' },
   *   { escalated: true, status: 'escalated' },
   *   { escalated: true, status: 'escalated' }
   * ];
   * const rate = metricsService.calculateEscalationRate(calls);
   * // Returns: 66.67
   */
  calculateEscalationRate(calls) {
    try {
      console.log(`[${new Date().toISOString()}] [DEBUG] [MetricsService] Calculating escalation rate for ${calls.length} calls`);

      // Validate input
      if (!Array.isArray(calls) || calls.length === 0) {
        console.log(`[${new Date().toISOString()}] [WARN] [MetricsService] No calls provided for escalation rate calculation`);
        return 0;
      }

      // Count escalated calls
      // Only consider completed calls (not still active)
      const completedCalls = calls.filter(call => call.status !== 'active');
      const escalatedCalls = completedCalls.filter(call => call.escalated === true);

      if (completedCalls.length === 0) {
        console.log(`[${new Date().toISOString()}] [WARN] [MetricsService] No completed calls found`);
        return 0;
      }

      // Calculate escalation rate as percentage
      const escalationRate = (escalatedCalls.length / completedCalls.length) * 100;
      const result = Number(escalationRate.toFixed(2));

      console.log(`[${new Date().toISOString()}] [DEBUG] [MetricsService] Escalation rate calculated: ${result}% (${escalatedCalls.length}/${completedCalls.length} calls)`);

      return result;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [MetricsService] Error calculating escalation rate`, error);
      return 0;
    }
  }

  /**
   * Identify trends in time-series data points
   * Analyzes direction (improving/declining/stable) and strength
   *
   * @param {Array<Object>} dataPoints - Array of data points with date and value
   * @param {string} dataPoints[].date - Date in YYYY-MM-DD format
   * @param {number} dataPoints[].value - Metric value
   * @returns {Object} Trend analysis result
   * @returns {string} return.direction - 'improving', 'declining', or 'stable'
   * @returns {number} return.strength - Strength of trend (0-1)
   * @returns {string} return.summary - Human-readable summary
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const dataPoints = [
   *   { date: '2025-10-01', value: 0.5 },
   *   { date: '2025-10-02', value: 0.6 },
   *   { date: '2025-10-03', value: 0.7 }
   * ];
   * const trend = metricsService.identifyTrends(dataPoints);
   * // Returns: { direction: 'improving', strength: 0.8, summary: '...' }
   */
  identifyTrends(dataPoints) {
    try {
      console.log(`[${new Date().toISOString()}] [DEBUG] [MetricsService] Identifying trends for ${dataPoints.length} data points`);

      // Validate input
      if (!Array.isArray(dataPoints) || dataPoints.length < 2) {
        console.log(`[${new Date().toISOString()}] [WARN] [MetricsService] Insufficient data points for trend analysis`);
        return {
          direction: 'stable',
          strength: 0,
          summary: 'Insufficient data for trend analysis'
        };
      }

      // Sort data points by date to ensure chronological order
      const sortedData = [...dataPoints].sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
      });

      // Use simple linear regression to determine trend
      // Calculate slope using least squares method
      const n = sortedData.length;
      const xValues = sortedData.map((_, index) => index); // Use index as x-axis
      const yValues = sortedData.map(point => point.value);

      // Calculate means
      const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
      const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;

      // Calculate slope (m) and correlation coefficient
      let numerator = 0;
      let denominatorX = 0;
      let denominatorY = 0;

      for (let i = 0; i < n; i++) {
        const xDiff = xValues[i] - xMean;
        const yDiff = yValues[i] - yMean;
        numerator += xDiff * yDiff;
        denominatorX += xDiff * xDiff;
        denominatorY += yDiff * yDiff;
      }

      const slope = denominatorX !== 0 ? numerator / denominatorX : 0;

      // Calculate correlation coefficient (R) to determine strength
      const correlation = (denominatorX !== 0 && denominatorY !== 0)
        ? numerator / Math.sqrt(denominatorX * denominatorY)
        : 0;

      const strength = Math.abs(correlation); // Strength is absolute value of correlation

      // Determine trend direction based on slope
      // Use a threshold to avoid classifying noise as trends
      const threshold = 0.01; // Minimum slope to be considered a trend
      let direction;

      if (Math.abs(slope) < threshold) {
        direction = 'stable';
      } else if (slope > 0) {
        direction = 'improving';
      } else {
        direction = 'declining';
      }

      // Generate human-readable summary
      let summary;
      if (direction === 'stable') {
        summary = 'Metrics are relatively stable with no significant trend.';
      } else if (direction === 'improving') {
        if (strength > 0.7) {
          summary = 'Strong upward trend detected. Metrics are improving significantly.';
        } else if (strength > 0.4) {
          summary = 'Moderate upward trend. Metrics are gradually improving.';
        } else {
          summary = 'Slight upward trend detected.';
        }
      } else { // declining
        if (strength > 0.7) {
          summary = 'Strong downward trend detected. Immediate attention recommended.';
        } else if (strength > 0.4) {
          summary = 'Moderate downward trend. Monitor closely for continued decline.';
        } else {
          summary = 'Slight downward trend detected.';
        }
      }

      const result = {
        direction,
        strength: Number(strength.toFixed(2)),
        summary
      };

      console.log(`[${new Date().toISOString()}] [DEBUG] [MetricsService] Trend identified: ${direction} (strength: ${result.strength})`);

      return result;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [MetricsService] Error identifying trends`, error);
      return {
        direction: 'stable',
        strength: 0,
        summary: 'Error analyzing trends'
      };
    }
  }

  /**
   * Generate human-readable summary from metrics
   * Creates actionable insights from raw metrics data
   *
   * @param {Object} metrics - Metrics object
   * @param {number} [metrics.escalationRate] - Escalation rate percentage
   * @param {number} [metrics.successRate] - Success rate percentage
   * @param {number} [metrics.totalCalls] - Total number of calls
   * @param {number} [metrics.avgSentiment] - Average sentiment score
   * @param {number} [metrics.avgDuration] - Average duration in seconds
   * @returns {string} Human-readable summary
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const summary = metricsService.generateSummary({
   *   escalationRate: 15.5,
   *   totalCalls: 100,
   *   avgSentiment: 0.75
   * });
   */
  generateSummary(metrics) {
    try {
      console.log(`[${new Date().toISOString()}] [DEBUG] [MetricsService] Generating summary for metrics`);

      const summaryParts = [];

      // Summary for total calls
      if (metrics.totalCalls !== undefined) {
        summaryParts.push(`Processed ${metrics.totalCalls} total calls.`);
      }

      // Summary for escalation rate
      if (metrics.escalationRate !== undefined) {
        if (metrics.escalationRate < 10) {
          summaryParts.push(`Excellent escalation rate of ${metrics.escalationRate}%.`);
        } else if (metrics.escalationRate < 20) {
          summaryParts.push(`Good escalation rate of ${metrics.escalationRate}%.`);
        } else if (metrics.escalationRate < 30) {
          summaryParts.push(`Moderate escalation rate of ${metrics.escalationRate}%.`);
        } else {
          summaryParts.push(`High escalation rate of ${metrics.escalationRate}% requires attention.`);
        }
      }

      // Summary for success rate
      if (metrics.successRate !== undefined) {
        if (metrics.successRate > 80) {
          summaryParts.push(`Strong success rate of ${metrics.successRate}%.`);
        } else if (metrics.successRate > 60) {
          summaryParts.push(`Moderate success rate of ${metrics.successRate}%.`);
        } else {
          summaryParts.push(`Low success rate of ${metrics.successRate}% needs improvement.`);
        }
      }

      // Summary for sentiment
      if (metrics.avgSentiment !== undefined) {
        if (metrics.avgSentiment > 0.5) {
          summaryParts.push(`Customers are very satisfied (sentiment: ${metrics.avgSentiment}).`);
        } else if (metrics.avgSentiment > 0) {
          summaryParts.push(`Overall positive customer sentiment (${metrics.avgSentiment}).`);
        } else if (metrics.avgSentiment > -0.5) {
          summaryParts.push(`Mixed customer sentiment (${metrics.avgSentiment}).`);
        } else {
          summaryParts.push(`Negative customer sentiment (${metrics.avgSentiment}) requires immediate attention.`);
        }
      }

      // Summary for duration
      if (metrics.avgDuration !== undefined) {
        const minutes = Math.floor(metrics.avgDuration / 60);
        const seconds = Math.round(metrics.avgDuration % 60);
        summaryParts.push(`Average call duration: ${minutes}m ${seconds}s.`);
      }

      const summary = summaryParts.join(' ');

      console.log(`[${new Date().toISOString()}] [DEBUG] [MetricsService] Summary generated`);

      return summary;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [MetricsService] Error generating summary`, error);
      return 'Error generating metrics summary.';
    }
  }

  /**
   * Export metrics to JSON format
   * Serializes metrics data for storage or transmission
   *
   * @param {Object} metrics - Metrics object to export
   * @returns {string} JSON string representation
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const json = metricsService.exportToJSON(metrics);
   * fs.writeFileSync('metrics.json', json);
   */
  exportToJSON(metrics) {
    try {
      console.log(`[${new Date().toISOString()}] [DEBUG] [MetricsService] Exporting metrics to JSON`);

      // Pretty print JSON with 2-space indentation for readability
      return JSON.stringify(metrics, null, 2);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [MetricsService] Error exporting to JSON`, error);
      return '{}';
    }
  }

  /**
   * Export metrics to CSV format
   * Converts metrics data to comma-separated values
   *
   * @param {Array<Object>} metricsArray - Array of metrics objects
   * @returns {string} CSV string representation
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const dailyMetrics = [
   *   { date: '2025-10-01', total_calls: 10, avg_sentiment: 0.8 },
   *   { date: '2025-10-02', total_calls: 15, avg_sentiment: 0.7 }
   * ];
   * const csv = metricsService.exportToCSV(dailyMetrics);
   */
  exportToCSV(metricsArray) {
    try {
      console.log(`[${new Date().toISOString()}] [DEBUG] [MetricsService] Exporting metrics to CSV`);

      // Validate input
      if (!Array.isArray(metricsArray) || metricsArray.length === 0) {
        console.log(`[${new Date().toISOString()}] [WARN] [MetricsService] No metrics provided for CSV export`);
        return '';
      }

      // Extract all unique keys from all objects to create headers
      const allKeys = new Set();
      metricsArray.forEach(metrics => {
        Object.keys(metrics).forEach(key => allKeys.add(key));
      });

      const headers = Array.from(allKeys);

      // Create CSV header row
      const csvRows = [headers.join(',')];

      // Create CSV data rows
      metricsArray.forEach(metrics => {
        const row = headers.map(header => {
          const value = metrics[header];

          // Handle different data types
          if (value === null || value === undefined) {
            return '';
          } else if (typeof value === 'object') {
            // Convert objects/arrays to JSON string and escape quotes
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          } else if (typeof value === 'string' && value.includes(',')) {
            // Escape strings containing commas
            return `"${value.replace(/"/g, '""')}"`;
          } else {
            return value;
          }
        });

        csvRows.push(row.join(','));
      });

      const csv = csvRows.join('\n');

      console.log(`[${new Date().toISOString()}] [DEBUG] [MetricsService] CSV export complete with ${csvRows.length - 1} rows`);

      return csv;

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [MetricsService] Error exporting to CSV`, error);
      return '';
    }
  }
}

module.exports = MetricsService;
