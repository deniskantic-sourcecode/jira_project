<template>
  <div
    class="d-flex justify-center items-center"
    style="
      display: grid;
      height: 100vh;
      width: 100%;
      grid-template-rows: 65vh 35vh;
      grid-template-columns: 1fr;
    "
  >
    <div
      v-if="is_loading"
      style="
        display: flex;
        justify-content: center;
        flex-direction: column;
        align-items: center;
        height: 100%;
      "
    >
      <v-progress-circular
        :size="100"
        color="primary"
        indeterminate
      ></v-progress-circular>
      Loading...
    </div>

    <div
      v-if="!is_loading"
      style="display: grid; grid-template-columns: 1fr 1fr; height: 100%"
    >
      <v-chart :option="option" style="height: 100%; width: 100%"></v-chart>
      <div>
        <v-chart
          :option="stacked_bar"
          style="height: 100%; width: 100%"
        ></v-chart>
      </div>
    </div>

    <div
      v-if="!is_loading"
      style="width: 100%; height: 100%; background-color: lightblue"
    >
      <v-data-table
        :headers="headers"
        :items="table_data"
        item-key="ticket_id"
        class="elevation-1"
      >
        <template v-slot:top>
          <v-toolbar flat>
            <v-toolbar-title>Ticket Data</v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
        </template>

        <template v-slot:item="{ item }">
          <tr>
            <td>{{ item.ticket_id }}</td>
            <td>{{ item.ticket_label.join(", ") }}</td>
            <td>{{ item.created_at }}</td>
            <td>{{ item.priority }}</td>
            <td>{{ item.status }}</td>
          </tr>
        </template>
      </v-data-table>
    </div>
  </div>
</template>
<script>
import VChart from "vue-echarts";
import "echarts";

export default {
  components: {
    VChart,
  },
  data() {
    return {
      headers: [
        { text: "Ticket ID", align: "start", key: "ticket_id" },
        { text: "Labels", align: "start", key: "ticket_label" },
        { text: "Created At", align: "start", key: "created_at" },
        { text: "Priority", align: "start", key: "priority" },
        { text: "Status", align: "start", key: "status" },
      ],
      stacked_bar: {
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "shadow", // Use axis to trigger tooltip
          },
        },
        legend: {
          bottom: 0,
        },
        grid: {
          left: "3%",
          right: "4%",
          bottom: "3%",
          containLabel: true,
        },
        xAxis: {
          type: "value",
        },
        yAxis: {
          type: "category",
        },
        series: [],
      },
      option: {
        backgroundColor: "#ffffff",
        title: {
          text: "Tickets by Priority",
          subtext: "Total Count by Priority",
          left: "center",
          top: "5%",
          textStyle: {
            color: "#0096a9",
            fontSize: 25,
          },
          subtextStyle: {
            color: "#0096a9",
            fontSize: 15,
          },
        },
        legend: {
          orient: "horizontal",
          bottom: "5%",
          left: "center",
          itemGap: 20,
          data: ["Low", "Medium", "High", "Highest"],
          textStyle: {
            fontSize: 16,
            color: "#000000",
          },
        },
        series: [
          {
            name: "Priority",
            type: "pie",
            radius: "70%",
            data: [],
            label: {
              color: "#0096a9",
              fontSize: 20,
              formatter: "{b}: {c} ({d}%)",
            },
            top: "10%",
          },
        ],
        roseType: "radius",
      },
      is_loading: false,
      table_data: [],
      startAt: 0,
      maxResults: 50,
      total_count: 0,
    };
  },

  methods: {
    async get_data() {
      this.is_loading = true;

      const api_url =
        "http://localhost:8010/proxy/rest/api/2/search?jql=project%20%3D%20PI%20AND%20assignee%20IS%20NOT%20EMPTY%20AND%20status%20%21%3D%20%22Done%22";
      const authHeader =
        "Basic " +
        btoa(process.env.VUE_APP_EMAIL + ":" + process.env.VUE_APP_API_KEY);

      const maxResults = 50;
      let totalIssues = [];
      let priorityCounts = {
        Lowest: { total: 0, statuses: { "In Progress": 0, "To Do": 0 } },
        Medium: { total: 0, statuses: { "In Progress": 0, "To Do": 0 } },
        High: { total: 0, statuses: { "In Progress": 0, "To Do": 0 } },
        Highest: { total: 0, statuses: { "In Progress": 0, "To Do": 0 } },
      };

      try {
        const initialResponse = await this.$http({
          method: "GET",
          url: `${api_url}&startAt=0&maxResults=${maxResults}`,
          headers: {
            Authorization: authHeader,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        const total = initialResponse.data.total;
        const totalPages = Math.ceil(total / maxResults);

        const pagePromises = Array.from({ length: totalPages }).map((_, i) => {
          const startAt = i * maxResults;
          return this.$http({
            method: "GET",
            url: `${api_url}&startAt=${startAt}&maxResults=${maxResults}`,
            headers: {
              Authorization: authHeader,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }).then((pageResponse) => {
            const data_from = pageResponse.data.issues;
            totalIssues = totalIssues.concat(data_from);
            console.log(`Fetched Page ${i + 1}:`, data_from);
          });
        });

        await Promise.all(pagePromises);

        this.table_data = totalIssues.map((x) => {
          const priority = x.fields.priority
            ? x.fields.priority.name
            : "Unknown";
          const status = x.fields.status
            ? x.fields.status.statusCategory.name
            : "-";

          if (priorityCounts[priority]) {
            priorityCounts[priority].total += 1;
          }
          if (
            priorityCounts[priority] &&
            priorityCounts[priority].statuses[status] !== undefined
          ) {
            priorityCounts[priority].statuses[status] += 1;
          }

          return {
            ticket_id: x.key,
            ticket_label: x.fields.labels,
            created_at: x.fields.created,
            priority: priority,
            status: status,
          };
        });

        console.log("Fetched Data:", this.table_data);

        this.updateCharts(priorityCounts);
      } catch (error) {
        console.error("Error in fetching data:", error);
      } finally {
        this.is_loading = false;
      }
    },

    updateCharts(priority_counts) {
      let series_data = [];
      let yAxisData = ["Lowest", "Medium", "High", "Highest"];

      console.log("PRIORITY", Object.keys(priority_counts));

      let lowest_in_progress = priority_counts.Lowest.statuses["In Progress"];
      let lowest_to_do = priority_counts.Lowest.statuses["To Do"];

      let medium_in_progress = priority_counts.Medium.statuses["In Progress"];
      let medium_to_do = priority_counts.Medium.statuses["To Do"];

      let high_in_progress = priority_counts.High.statuses["In Progress"];
      let high_to_do = priority_counts.High.statuses["To Do"];

      let highest_in_progress = priority_counts.Highest.statuses["In Progress"];
      let highest_to_do = priority_counts.Highest.statuses["To Do"];

      series_data.push({
        name: "To Do",
        type: "bar",
        stack: "total",
        label: { show: true },
        emphasis: { focus: "series" },
        data: [
          lowest_to_do || 0,
          medium_to_do || 0,
          high_to_do || 0,
          highest_to_do || 0,
        ],
      });

      series_data.push({
        name: "In Progress",
        type: "bar",
        stack: "total",
        label: { show: true },
        emphasis: { focus: "series" },
        data: [
          lowest_in_progress || 0,
          medium_in_progress || 0,
          high_in_progress || 0,
          highest_in_progress || 0,
        ],
      });

      this.stacked_bar.series = series_data;
      this.stacked_bar.yAxis.data = yAxisData;

      const pieData = Object.keys(priority_counts).map((priority) => ({
        name: priority,
        value: priority_counts[priority].total || 0,
        itemStyle: this.getPriorityColor(priority),
      }));

      this.option.series[0].data = pieData;
      this.option.legend.data = Object.keys(priority_counts);
    },

    getPriorityColor(priority) {
      switch (priority) {
        case "Highest":
          return { color: "#ff4d4f" };
        case "High":
          return { color: "#ff7f7f" };
        case "Medium":
          return { color: "#ffb74d" };
        case "Lowest":
          return { color: "#66bb6a" };
        default:
          return { color: "#66bb6a" };
      }
    },
  },

  mounted() {
    this.get_data();
  },
};
</script>
