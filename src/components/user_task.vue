<template>
  <v-app style="width: 100%; max-height: 100vh" class="pa-0">
    <div v-if="is_loading">Loading...</div>

    <v-chart
      :option="option"
      style="height: 100%; width: 100%; padding-top: 3rem"
    ></v-chart>
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
        { text: "Work in progress" },
        { text: "Waiting on support" },
        { text: "Waiting on client" },
        { text: "Ready for production" },
      ],
      option: {
        title: {
          text: "Tickets per user overview",
          subtext: "PI Board",
          left: "center",
          fontSize: 20,
        },
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "shadow",
          },
        },
        grid: {
          left: "3%",
          right: "4%",
          top: "10%",
          bottom: "3%",
          containLabel: true,
        },
        legend: {
          top: 50,
          itemGap: 20,
          itemWidth: 20,
        },
        xAxis: {
          type: "value",
          max: 35,
          interval: 5,
        },
        yAxis: {
          type: "category",
          axisLabel: {
            fontSize: 16,
            formatter: function (value) {
              return value === 0 ? "" : value; // If the value is 0, don't display it
            },
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
      const statusNames = [
        "Open",
        "Work in progress",
        "Waiting for support",
        "Waiting on client",
        "Ready for production",
      ];

      let generate_series = statusNames.map((status) => ({
        name: status,
        type: "bar",
        stack: "total",
        label: {
          show: true,
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
    get_data() {
      this.is_loading = true;
      let api_url =
        "http://localhost:8010/proxy/rest/api/2/search?jql=project=PI%20AND%20assignee%20IS%20NOT%20EMPTY%20AND%20status%20!=%20%22Done%22&maxResults=1000"; // Set a large enough number for maxResults

      let usersData = {};

      const authHeader =
        "Basic " +
        btoa(process.env.VUE_APP_EMAIL + ":" + process.env.VUE_APP_API_KEY);

      // Define the mapping between Jira status and your desired snake_case format
      const statusMapping = {
        Open: "open",
        "Work in progress": "work_in_progress",
        "Waiting for support": "waiting_for_support",
        "Waiting on client": "waiting_on_client",
        "Ready for production": "ready_for_production",
      };

      this.$http({
        method: "GET",
        url: api_url,
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
        .then((response) => {
          const data_from = response.data.issues;
          console.log("RESPONSE", response.data);

          data_from.forEach((x) => {
            const userId = x.fields.assignee
              ? x.fields.assignee.displayName
              : "Unassigned";
            const status = x.fields.status.name;
            const userImage = x.fields.assignee
              ? x.fields.assignee.avatarUrls["48x48"]
              : null;

            // Get the mapped status (convert to snake_case)
            const mappedStatus = statusMapping[status.trim()] || status; // Trim any extra spaces and fallback to original status

            if (!usersData[userId]) {
              usersData[userId] = {
                username: userId,
                user_image: userImage,
                statusCounts: {
                  open: 0,
                  work_in_progress: 0,
                  waiting_for_support: 0,
                  waiting_on_client: 0,
                  ready_for_production: 0,
                },
                total_count: 0,
              };
            }

            // Increment the count for the mapped status
            if (usersData[userId].statusCounts[mappedStatus] !== undefined) {
              usersData[userId].statusCounts[mappedStatus] += 1;
            }

            usersData[userId].total_count += 1;
          });

          // Convert usersData object to an array for rendering
          this.usersStats = Object.values(usersData);
          console.log("User Stats with Status Counts:", this.usersStats);

          this.data_result = this.usersStats;
          console.log("DATA RESULT", this.data_result);
          console.log(
            "DATA CHART",
            (this.option.yAxis.data = this.data_result)
          );
          this.initialize_chart();
        })
        .catch((error) => {
          console.log("ERROR", error);
          this.is_loading = false;
        })
        .finally(() => {
          this.is_loading = false;
        });
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
