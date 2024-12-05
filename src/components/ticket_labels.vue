<template>
  <v-app style="width: 100; height: 100%" class="pa-0">
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

    <div v-if="error" style="text-align: center; color: red; margin-top: 20px">
      <p>Fetch data failed. Please try again later.</p>
    </div>

    <div style="width: 100; height: 100%">
      <v-row v-if="!is_loading && !error" style="height: 100%">
        <v-col cols="12">
          <v-data-table
            style="text-align: center"
            class="elevation-1"
            :headers="headers"
            :items="new_result"
            item-key="ticket_label"
            :items-per-page="20"
          >
            <template v-if="!is_loading" v-slot:item="props">
              <tr style="text-align: center">
                <!-- <td>{{ filtered_labels(props.item.ticket_label) }}</td> -->
                <td>{{ props.item.key }}</td>
                <td>{{ props.item.label }}</td>
                <td>{{ props.item.open }}</td>
                <td>{{ props.item.done }}</td>
                <td>
                  {{ format_time(props.item.total_timestamp_open) }}
                </td>
                <td>
                  {{ format_time(props.item.total_timestamp_done) }}
                </td>
                <td
                  style="
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    grid-template-rows: 1fr 1fr;
                    gap: 0.5rem;
                    text-align: center;
                    height: 100%;
                    padding: 0.5rem;
                    font-size: 0.7rem;
                  "
                >
                  <span style="background-color: red; padding: 0.5rem"
                    >Low: {{ props.item.priority_lowest }}</span
                  >
                  <span style="background-color: blue; padding: 0.5rem"
                    >Medium: {{ props.item.priority_medium }}</span
                  >
                  <span style="background-color: aqua; padding: 0.5rem"
                    >High: {{ props.item.priority_high }}</span
                  >
                  <span style="background-color: orange; padding: 0.5rem"
                    >Highest: {{ props.item.priority_highest }}</span
                  >
                </td>
              </tr>
            </template>
          </v-data-table>
        </v-col>
      </v-row>
    </div>
  </v-app>
</template>

<script>
export default {
  data() {
    return {
      headers: [
        { text: "Task-ID" },
        { text: "Label" },
        { text: "Open" },
        { text: "Closed" },
        { text: "Time spent `open`" },
        { text: "Time spent `done`" },
        { text: "Priority" },
      ],
      data_result: [],
      new_result: [],
      error: false,
      is_overdue: false,
      is_loading: false,
    };
  },

  methods: {
    format_time(seconds) {
      if (seconds == 0) {
        return `-/-`;
      }

      if (seconds < 60) {
        return `${seconds} seconds`;
      }

      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) {
        return `${minutes} minute${minutes > 1 ? "s" : ""}`;
      }

      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    },
    format_date(date_string) {
      const cleaned_date_string = date_string.split("(")[0].trim();

      const date = new Date(cleaned_date_string);

      if (isNaN(date.getTime())) {
        return "-";
      }

      const day = ("0" + date.getDate()).slice(-2);
      const month = ("0" + (date.getMonth() + 1)).slice(-2);
      const year = date.getFullYear();

      return `${day}.${month}.${year}`;
    },
    filtered_labels(labels) {
      const filtered = labels
        .filter((x) => x !== "jira_escalated" && x !== "Zatvoreno")
        .join(" ,");
      console.log(filtered);
      return filtered;
    },
    get_data() {
      this.is_loading = true;
      let api_url =
        "http://localhost:8010/proxy/rest/api/2/search?jql=project%20%3D%20PI%20AND%20assignee%20IS%20NOT%20EMPTY";

      const authHeader =
        "Basic " +
        btoa(process.env.VUE_APP_EMAIL + ":" + process.env.VUE_APP_API_KEY);

      let maxResults = 50;
      let totalIssues = [];

      // Initial API request to get the total number of issues
      this.$http({
        method: "GET",
        url: `${api_url}&startAt=0&maxResults=1`, // Only fetch 1 issue initially to get the total count
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
        .then((response) => {
          const total = response.data.total; // Total number of issues
          let totalPages = Math.ceil(total / maxResults); // Calculate total pages

          // Now we can fetch all the pages using pagination
          let promises = [];
          for (let i = 0; i < totalPages; i++) {
            let startAt = i * maxResults;
            let pageRequest = this.$http({
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
                totalIssues = totalIssues.concat(data_from); // Concatenate results into the totalIssues array
                console.log(`Fetched Page ${i + 1}:`, data_from);
              })
              .catch((error) => {
                console.error(`Error fetching page ${i + 1}:`, error);
              });

            promises.push(pageRequest);
          }

          // After all pages are fetched, process the data
          Promise.all(promises)
            .then(() => {
              if (this.error) return; // if error happens, stop all
              console.log("All pages fetched successfully.");

              this.data_result = [];

              // Process the fetched issues into the desired format
              totalIssues.forEach((x) => {
                this.data_result.push({
                  label: this.filtered_labels(x.fields.labels) || "-/-",
                  id: x.id,
                  key: x.key,
                  priority: x.fields.priority.name,
                  time_spent: x.fields.aggregatetimespent || 0,
                  status: x.fields.status.name,
                });
              });

              console.log("NEW DATA", this.data_result);

              this.new_result = [];
              let aggregation = {};

              // Aggregate the data by label
              this.data_result.forEach((x) => {
                if (!aggregation[x.label]) {
                  aggregation[x.label] = {
                    label: x.label,
                    id: x.id,
                    key: x.key,
                    open: 0,
                    priority_lowest: 0,
                    priority_medium: 0,
                    priority_high: 0,
                    priority_highest: 0,
                    done: 0,
                    total_timestamp_open: 0,
                    total_timestamp_done: 0,
                  };
                }

                let label_data = aggregation[x.label];

                if (
                  x.status === "Open" ||
                  x.status === "Waiting on client" ||
                  x.status === "Waiting for support" ||
                  x.status === "Ready for production"
                ) {
                  label_data.open += 1;
                  label_data.total_timestamp_open += x.time_spent;
                }

                if (x.status === "Done") {
                  label_data.done += 1;
                  label_data.total_timestamp_done += x.time_spent;
                }

                if (x.priority === "Lowest") {
                  label_data.priority_lowest += 1;
                } else if (x.priority === "Medium") {
                  label_data.priority_medium += 1;
                } else if (x.priority === "High") {
                  label_data.priority_high += 1;
                } else if (x.priority === "Highest") {
                  label_data.priority_highest += 1;
                }
              });

              this.new_result = Object.values(aggregation);

              console.log("AGGREGATED RESULT", this.new_result);
            })
            .catch((error) => {
              console.error("Error in fetching or processing data:", error);
              this.is_loading = false;
              this.error = true;
            })
            .finally(() => {
              this.is_loading = false;
            });
        })
        .catch((error) => {
          console.error("Error fetching total count:", error);
          this.is_loading = false;
          this.error = true;
        });
    },
  },

  mounted() {
    this.is_loading = true;
    this.get_data();
    // console.log("ENV", process.env.VUE_APP_EMAIL); // Logs your email
    // console.log("ENV", process.env.VUE_APP_API_KEY);
    this.is_loading = true;
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
