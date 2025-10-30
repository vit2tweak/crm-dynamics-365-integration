import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useDynamics365 } from '../../hooks/useDynamics365';
import { D365Opportunity } from '../../types/dynamics365';
import { LoadingSpinner } from '../common/LoadingSpinner';
import '../../styles/components.css';

interface SalesMetrics {
  totalOpportunities: number;
  totalValue: number;
  wonOpportunities: number;
  wonValue: number;
  lostOpportunities: number;
  lostValue: number;
  winRate: number;
  averageDealSize: number;
  pipelineValue: number;
  forecastValue: number;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
    borderWidth?: number;
  }[];
}

interface DateRange {
  start: Date;