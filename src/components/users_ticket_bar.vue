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
    get_data() {
      this.is_loading = true;

      const api_url =
        "http://localhost:8010/proxy/rest/api/2/search?jql=project=PI%20AND%20assignee%20IS%20NOT%20EMPTY%20AND%20status%20!=%20%22Done%22";

      let usersData = {};
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

            console.log("RESPOSNE", data_from);

            data_from.forEach((x) => {
              const userId = x.fields.assignee
                ? x.fields.assignee.displayName
                : "Unassigned";
              const status = x.fields.status.name.trim();
              const user_image = x.fields.assignee
                ? x.fields.assignee.avatarUrls["48x48"]
                : null;

              if (status !== "Done") {
                if (!usersData[userId]) {
                  usersData[userId] = {
                    username: userId,
                    avatar_url: user_image,
                    statusCounts: {},
                  };
                }

                if (!usersData[userId].statusCounts[status]) {
                  usersData[userId].statusCounts[status] = 0;
                }

                usersData[userId].statusCounts[status] += 1;
              }
            });

            if (data_from.length === maxResults) {
              startAt += maxResults;
              maxResults += startAt;
              fetchData();
            } else {
              this.usersStats = Object.values(usersData);
              this.initialize_chart();
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

    initialize_chart() {
      if (!this.usersStats || this.usersStats.length === 0) {
        return;
      }
      const statusData = this.usersStats.map((user) => ({
        name: user.username,
        value: Object.values(user.statusCounts).reduce(
          (acc, count) => acc + count,
          0
        ),
      }));

      this.option.yAxis.data = statusData.map((user) => user.name); // Set the Y axis labels (usernames)
      this.option.series[0].data = statusData.map((user) => user.value); // Set the X axis data (ticket counts)
    },
  },

  mounted() {
    this.get_data();
  },
};
</script>
