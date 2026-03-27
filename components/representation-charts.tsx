"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

import styles from "./representation-charts.module.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type RepresentationChartsProps = {
  readonly ageBandCounts: Record<string, number>;
  readonly groupCounts: Record<string, number>;
};

const chartOptions = {
  responsive: true,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
};

function createChartData(counts: Record<string, number>) {
  const entries = Object.entries(counts).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return {
    labels: entries.map(([label]) => label),
    datasets: [
      {
        label: "Responses",
        data: entries.map(([, value]) => value),
        backgroundColor: "rgba(27, 105, 210, 0.65)",
        borderColor: "rgba(18, 73, 145, 1)",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };
}

export function RepresentationCharts({
  ageBandCounts,
  groupCounts,
}: RepresentationChartsProps) {
  const ageBandData = createChartData(ageBandCounts);
  const groupData = createChartData(groupCounts);

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <h3 className={styles.chartTitle}>Responses by Age Band</h3>
        {ageBandData.labels.length > 0 ? (
          <Bar data={ageBandData} options={chartOptions} />
        ) : (
          <p className={styles.empty}>No age-band data yet.</p>
        )}
      </section>

      <section className={styles.card}>
        <h3 className={styles.chartTitle}>Responses by Group</h3>
        {groupData.labels.length > 0 ? (
          <Bar data={groupData} options={chartOptions} />
        ) : (
          <p className={styles.empty}>No group data yet.</p>
        )}
      </section>
    </div>
  );
}
