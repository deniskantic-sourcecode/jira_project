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
          text: "Tickets and Time Spent by Users",
          subtext: "PI Board",
          left: "center",
          fontSize: 20,
        },
        legend: {
          data: ["Tickets", "Time Spent (hrs : min)"],
          top: "5%",
        },
        xAxis: {
          type: "value",
          name: "Count / Time",
          max: 50,
          interval: 10,
          axisLabel: {
            fontSize: 14,
            formatter: "{value}",
          },
        },
        yAxis: {
          type: "category",
          axisLabel: {
            fontSize: 14,
            padding: [0, 10],
            color: "#333",
          },
          data: [],
        },
        series: [
          {
            name: "Tickets",
            type: "bar",
            stack: "total",
            label: {
              show: true,
              position: "inside",
              formatter: "{c}",
              color: "#000000",
              fontSize: 12,
            },
            itemStyle: {
              color: "#4caf50",
            },
            data: [],
          },
          {
            name: "Time Spent (hrs : min)",
            type: "bar",
            label: {
              show: true,
              position: "inside",
              formatter: (params) => this.convertSecondsToTime(params.value),
              color: "#000000",
              fontSize: 12,
            },
            itemStyle: {
              color: "#ff9800",
            },
            data: [],
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
          }).then(async (pageResponse) => {
            const data_from = pageResponse.data.issues;

            totalIssues = totalIssues.concat(data_from);

            await Promise.all(
              data_from.map(async (issue) => {
                const issueKey = issue.key;
                const worklogResponse = await this.$http({
                  method: "GET",
                  url: `http://localhost:8010/proxy/rest/api/2/issue/${issueKey}/worklog`,
                  headers: {
                    Authorization: authHeader,
                    Accept: "application/json",
                  },
                });

                const worklogs = worklogResponse.data.worklogs;
                const today = new Date().toISOString().split("T")[0];

                worklogs.map((worklog) => {
                  const worklogDate = new Date(worklog.created)
                    .toISOString()
                    .split("T")[0];

                  if (worklogDate === today) {
                    const userId = worklog.author.displayName;
                    const timeSpent = worklog.timeSpentSeconds || 0;

                    if (!usersData[userId]) {
                      usersData[userId] = {
                        username: userId,
                        statusCounts: { "In Progress": 0, "To Do": 0 },
                        timeLoggedToday: 0,
                      };
                    }

                    usersData[userId].timeLoggedToday += timeSpent;
                  }
                });

                const status = issue.fields.status.statusCategory.name;
                const userId = issue.fields.assignee.displayName;

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
              })
            );
          });
        });

        await Promise.all(pagePromises);

        this.updateCharts(usersData);
      } catch (error) {
        console.error("Error in fetching data:", error);
      } finally {
        this.is_loading = false;
      }
    },

    convertSecondsToTime(seconds) {
      if (seconds <= 0) return "";

      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;

      return `${hours}:${formattedMinutes}`;
    },

    updateCharts(usersData) {
      const statusData = Object.values(usersData).map((user) => ({
        name: user.username,
        tickets: Object.values(user.statusCounts).reduce(
          (acc, count) => acc + count,
          0
        ),
        timeLoggedToday: user.timeLoggedToday,
      }));

      this.option.yAxis.data = statusData.map((user) => user.name);
      this.option.series[0].data = statusData.map((user) => user.tickets);

      this.option.series[1].data = statusData.map(
        (user) => user.timeLoggedToday
      );
    },
  },

  mounted() {
    this.get_data();
  },
};
</script>
