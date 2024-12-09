<template>
  <div
    class="d-flex justify-center items-center"
    style="height: 100vh; width: 100%; background-color: #ffffff"
  >
    <div
      v-if="is_loading"
      style="
        display: flex;
        justify-content: center;
        flex-direction: column;
        align-items: center;
        height: 100vh;
      "
    >
      <v-progress-circular
        :size="100"
        color="primary"
        indeterminate
      ></v-progress-circular>
      Loading...
    </div>

    <v-chart
      :option="option"
      style="height: 100%; width: 95%; padding-top: 3rem; margin: auto"
    ></v-chart>
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
      option: {
        title: {
          text: "Total assigned tickets by users",
          subtext: "PI Board",
          left: "center",
          fontSize: 20,
        },
        xAxis: {
          type: "value",
          max: 50,
          interval: 10,
          axisLabel: {
            fontSize: 20,
            formatter: "{value}",
          },
        },
        yAxis: {
          type: "category",
          axisLabel: {
            fontSize: 20,
            padding: [0, 10],
            color: "#333",
          },
          data: [],
        },
        series: [
          {
            name: "Tickets",
            type: "bar",
            data: [],
            label: {
              show: true,
              position: "inside",
              formatter: "{c}",
              color: "#fff",
              fontSize: 40,
            },
            itemStyle: {
              color: (params) => {
                const colorArray = [
                  "#4caf50",
                  "#ff9800",
                  "#2196f3",
                  "#9c27b0",
                  "#e91e63",
                  "#00bcd4",
                  "#8bc34a",
                  "#ff5722",
                  "#795548",
                  "#607d8b",
                ];
                return colorArray[params.dataIndex % colorArray.length];
              },
            },
          },
        ],
      },
      is_loading: false,
      usersStats: [],
    };
  },

  methods: {
    async get_data() {
      this.is_loading = true;

      const baseUrl = "http://localhost:8010/proxy/rest/api/2/search";
      const jql = "project = PI AND assignee IS NOT EMPTY AND status != 'Done'";

      const authHeader =
        "Basic " +
        btoa(process.env.VUE_APP_EMAIL + ":" + process.env.VUE_APP_API_KEY);

      const maxResults = 50;
      let totalIssues = [];
      let usersData = {};

      const params = {
        jql: jql,
        maxResults: maxResults,
        startAt: 0,
      };

      try {
        const initialResponse = await this.$http({
          method: "GET",
          url: baseUrl,
          headers: {
            Authorization: authHeader,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          params: params,
        });

        const total = initialResponse.data.total;
        const totalPages = Math.ceil(total / maxResults);

        const pagePromises = Array.from({ length: totalPages }).map((_, i) => {
          params.startAt = i * maxResults;
          return this.$http({
            method: "GET",
            url: baseUrl,
            headers: {
              Authorization: authHeader,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            params: params,
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
          const userId = x.fields.assignee
            ? x.fields.assignee.displayName
            : "Unassigned";

          if (!usersData[userId]) {
            usersData[userId] = {
              username: userId,
              statusCounts: { "In Progress": 0, "To Do": 0 },
              timeLoggedToday: 0,
            };
          }

          if (usersData[userId].statusCounts[status] !== undefined) {
            usersData[userId].statusCounts[status] += 1;
          }

          const worklogs = x.fields.worklog ? x.fields.worklog.worklogs : [];
          const todayDate = new Date().toISOString().split("T")[0];
          worklogs.forEach((log) => {
            const logDate = new Date(log.started).toISOString().split("T")[0];
            if (logDate === todayDate) {
              usersData[userId].timeLoggedToday += log.timeSpentSeconds || 0;
            }
          });

          return {
            ticket_id: x.key,
            ticket_label: x.fields.labels,
            created_at: x.fields.created,
            priority: priority,
            status: status,
          };
        });

        console.log("Fetched Data:", this.table_data);

        this.updateCharts(usersData);
      } catch (error) {
        console.error("Error in fetching data:", error);
      } finally {
        this.is_loading = false;
      }
    },

    updateCharts(usersData) {
      const statusData = Object.values(usersData).map((user) => ({
        name: user.username,
        value: Object.values(user.statusCounts).reduce(
          (acc, count) => acc + count,
          0
        ),
        timeLoggedToday: user.timeLoggedToday,
      }));

      this.option.yAxis.data = statusData.map((user) => user.name);
      this.option.series[0].data = statusData.map((user) => user.value);
    },
  },

  mounted() {
    this.get_data();
  },
};
</script>
