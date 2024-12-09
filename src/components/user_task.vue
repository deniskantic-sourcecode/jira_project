<template>
  <v-app style="width: 100%; max-height: 100vh" class="pa-0">
    <div v-if="is_loading">Loading...</div>

    <v-chart :option="option" style="height: 100%; width: 100%"></v-chart>
  </v-app>
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
        { text: "User" },
        { text: "Tickets total" },
        { text: "Open" },
        { text: "In Progress" },
      ],
      option: {
        backgroundColor: "#ffffff",
        title: {
          top: "2%",
          text: "Tickets per user overview",
          subtext: "PI Board",
          left: "center",
          textStyle: {
            color: "#000000",
            fontWeight: "bold",
            fontSize: 25,
          },
          subtextStyle: {
            color: "#000000",
            fontSize: 15,
          },
        },
        grid: {
          left: "3%",
          right: "4%",
          top: "10%",
          show: false,
          containLabel: true,
        },
        xAxis: {
          type: "value",
          max: 35,
          interval: 5,
          axisLabel: {
            fontSize: 16,
            fontWeight: "bold",
            color: "#000000",
          },
        },
        legend: {
          bottom: "2%",
          itemGap: 30,
          itemWidth: 20,
          textStyle: {
            fontSize: 16,
            color: "#000000",
          },
        },
        yAxis: {
          type: "category",
          axisLabel: {
            fontSize: 20,
            color: "#000000",
          },
          data: [],
        },
        series: [],
      },
      data_result: [],
      filteredData: [],
      is_loading: false,
    };
  },

  methods: {
    initialize_chart() {
      const statusNames = ["Open", "In Progress"];

      let generate_series = statusNames.map((status) => ({
        name: status,
        type: "bar",
        stack: "total",
        label: {
          show: true,
          fontSize: 25,
          color: "#ffffff",
          fontWeight: "bold",
        },
        emphasis: {
          focus: "series",
        },
        data: [],
      }));

      const usernames = this.data_result.map((x) => {
        statusNames.forEach((status, index) => {
          const statusKey = status.split(" ").join("_").toLowerCase();
          const statusCount = x.statusCounts[statusKey] || "";
          generate_series[index].data.push(statusCount);
        });

        return x.username;
      });

      this.option.yAxis.data = usernames;
      this.option.series = generate_series;

      console.log("Updated chart option:", this.option);
    },
    async get_data() {
      this.is_loading = true;

      const base_url = "http://localhost:8010/proxy/rest/api/2/search";
      const params = {
        jql: "project = PI AND assignee IS NOT EMPTY AND status != 'Done'",
        maxResults: 50,
        startAt: 0,
      };

      let usersData = {};

      const authHeader =
        "Basic " +
        btoa(process.env.VUE_APP_EMAIL + ":" + process.env.VUE_APP_API_KEY);

      const statusMapping = {
        "To Do": "open",
        "In Progress": "in_progress",
      };

      try {
        const initial_response = await this.$http({
          method: "GET",
          url: base_url,
          headers: {
            Authorization: authHeader,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          params: params,
        });

        const total = initial_response.data.total;
        const totalPages = Math.ceil(total / params.maxResults);

        const pagePromises = Array.from({ length: totalPages }).map((_, i) => {
          params.startAt = i * params.maxResults;

          return this.$http({
            method: "GET",
            url: base_url,
            headers: {
              Authorization: authHeader,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            params: params,
          }).then((page_response) => {
            const data_from = page_response.data.issues;

            data_from.forEach((x) => {
              const userId = x.fields.assignee
                ? x.fields.assignee.displayName
                : "Unassigned";
              const status = x.fields.status.statusCategory.name;
              const userImage = x.fields.assignee
                ? x.fields.assignee.avatarUrls["48x48"]
                : null;

              const mappedStatus = statusMapping[status.trim()] || status;
              if (!usersData[userId]) {
                usersData[userId] = {
                  username: userId,
                  user_image: userImage,
                  statusCounts: {
                    open: 0,
                    in_progress: 0,
                  },
                  total_count: 0,
                };
              }

              if (usersData[userId].statusCounts[mappedStatus] !== undefined) {
                usersData[userId].statusCounts[mappedStatus] += 1;
              }

              usersData[userId].total_count += 1;
            });
          });
        });

        await Promise.all(pagePromises);

        this.usersStats = Object.values(usersData);
        this.data_result = this.usersStats;

        this.initialize_chart();
      } catch (error) {
        console.log("ERROR", error);
      } finally {
        this.is_loading = false;
      }
    },
  },

  mounted() {
    this.is_loading = true;
    this.get_data();
    // console.log("ENV", process.env.VUE_APP_EMAIL); // Logs your email
    // console.log("ENV", process.env.VUE_APP_API_KEY);
  },
};
</script>

<style>
.navbar {
  padding: 0;
  margin: 0;
}

.v-img.rounded-circle {
  border-radius: 50%;
}
</style>
