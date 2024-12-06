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
        <!-- Table Header -->
        <template v-slot:top>
          <v-toolbar flat>
            <v-toolbar-title>Ticket Data</v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
        </template>

        <!-- Scoped Slot for each item -->
        <template v-slot:item="{ item }">
          <tr>
            <!-- Ticket ID -->
            <td>{{ item.ticket_id }}</td>
            <!-- Labels (joined into a single string) -->
            <td>{{ item.ticket_label.join(", ") }}</td>
            <!-- Created At (formatted) -->
            <td>{{ item.created_at }}</td>
            <!-- Priority -->
            <td>{{ item.priority }}</td>
            <!-- Status -->
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
            // Use axis to trigger tooltip
            type: "shadow", // 'shadow' as default; can also be 'line' or 'shadow'
          },
        },
        legend: {},
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
          data: ["Low", "Medium", "High", "Highest"],
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
        ].sort(function (a, b) {
          return a.value - b.value;
        }),
        roseType: "radius",
      },
      is_loading: false,
      table_data: [],
    };
  },

  methods: {
    get_data() {
      this.is_loading = true;

      const api_url =
        "http://localhost:8010/proxy/rest/api/2/search?jql=project=PI%20AND%20assignee%20IS%20NOT%20EMPTY%20AND%20status%20!=%20%22Done%22";

      // Updated object to store counts by priority and status
      let priorityCounts = {
        Lowest: {
          total: 0,
          statuses: {
            "In Progress": 0,
            "To Do": 0,
            "At Risk": 0,
            "In Testing": 0,
          },
        },

        Medium: {
          total: 0,
          statuses: {
            "In Progress": 0,
            "To Do": 0,
            "At Risk": 0,
            "In Testing": 0,
          },
        },
        High: {
          total: 0,
          statuses: {
            "In Progress": 0,
            "To Do": 0,
            "At Risk": 0,
            "In Testing": 0,
          },
        },
        Highest: {
          total: 0,
          statuses: {
            "In Progress": 0,
            "To Do": 0,
            "At Risk": 0,
            "In Testing": 0,
          },
        },
      };

      const authHeader =
        "Basic " +
        btoa(process.env.VUE_APP_EMAIL + ":" + process.env.VUE_APP_API_KEY);

      let startAt = 0;
      let maxResults = 50;

      const fetchData = () => {
        this.$http({
          method: "GET",
          url: `${api_url}&startAt=${startAt}&maxResults=${maxResults}`,
          headers: {
            Authorization: authHeader,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })
          .then((response) => {
            const data_from = response.data.issues;

            data_from.forEach((x) => {
              const priority = x.fields.priority
                ? x.fields.priority.name
                : "Unknown";
              const status = x.fields.status
                ? x.fields.status.statusCategory.name
                : "Unknown";

              this.table_data.push({
                ticket_id: x.key,
                ticket_label: x.fields.labels,
                created_at: x.fields.created,
                priority: priority,
                status: status,
              });

              if (priorityCounts[priority]) {
                priorityCounts[priority].total += 1;
              }

              if (
                priorityCounts[priority] &&
                priorityCounts[priority].statuses[status] !== undefined
              ) {
                priorityCounts[priority].statuses[status] += 1;
              }
            });

            console.log("Updated priority counts:", priorityCounts);

            if (data_from.length === maxResults) {
              startAt += maxResults;
              maxResults += startAt;
              fetchData();
            } else {
              this.is_loading = false;

              let seriesData = [];
              let yAxisData = ["Lowest", "Medium", "High", "Highest"];

              Object.keys(priorityCounts).forEach((priority) => {
                const statusData = priorityCounts[priority].statuses;

                seriesData.push({
                  name: priority,
                  type: "bar",
                  stack: "total",
                  label: { show: true },
                  emphasis: { focus: "series" },
                  data: [
                    statusData["To Do"] || 0,
                    statusData["In Progress"] || 0,
                    statusData["At Risk"] || 0,
                    statusData["In Testing"] || 0,
                  ],
                });
              });

              console.log(
                "tHIS DATA",
                this.table_data.map((x) => {
                  return x;
                })
              );

              this.stacked_bar.series = seriesData;

              this.stacked_bar.yAxis.data = yAxisData;

              const pieData = Object.keys(priorityCounts).map((priority) => ({
                name: priority,
                value: priorityCounts[priority].total || 0,
                itemStyle: this.getPriorityColor(priority),
              }));

              this.option.series[0].data = pieData;
              this.option.legend.data = Object.keys(priorityCounts);

              this.is_loading = false;
            }
          })
          .catch((error) => {
            console.log("ERROR", error);
            this.is_loading = false;
          });
      };

      fetchData();
    },

    getPriorityColor(priority) {
      switch (priority) {
        case "Highest":
          return { color: "#ff4d4f" };
        case "High":
          return { color: "#ff7f7f" };
        case "Medium":
          return { color: "#ffb74d" };
        case "Low":
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
