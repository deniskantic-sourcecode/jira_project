<template>
  <div
    class="d-flex justify-center items-center"
    style="height: 100vh; width: 100%"
  >
    <v-chart :option="option" style="height: 100%; width: 100"></v-chart>
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
              fontSize: 30,
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
    };
  },

  methods: {
    get_data() {
      this.is_loading = true;

      const api_url =
        "http://localhost:8010/proxy/rest/api/2/search?jql=project=PI%20AND%20assignee%20IS%20NOT%20EMPTY%20AND%20status%20!=%20%22Done%22";

      let priorityCounts = {
        Lowest: 0,
        Medium: 0,
        High: 0,
        Highest: 0,
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
                : "Lowest";

              if (priorityCounts[priority] !== undefined) {
                priorityCounts[priority] += 1;
              }
            });

            if (data_from.length === maxResults) {
              startAt += maxResults;
              fetchData();
            } else {
              const pieData = Object.keys(priorityCounts).map((priority) => ({
                name: priority,
                value: priorityCounts[priority] || "",
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
