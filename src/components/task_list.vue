<template>
  <v-app style="width: 100; height: 100%" class="pa-0">
    <div v-if="is_loading">Loading...</div>

    <div style="width: 100; height: 100vh">
      <v-row v-if="!is_loading" style="height: 90vh">
        <v-col cols="12" align="center">
          <v-data-table
            class="elevation-1"
            :headers="headers"
            :items="data_result"
            item-key="id"
            :items-per-page="10"
          >
            <template v-if="!is_loading" v-slot:item="props">
              <tr>
                <td>{{ props.item.ticket_id }}</td>
                <td>{{ props.item.ticket_name }}</td>
                <td>
                  {{ props.item.priority }}
                </td>
                <td>
                  {{ format_date(props.item.created_at) }}
                </td>

                <td>
                  <v-row align="center" no-gutters>
                    <v-col class="d-flex" cols="auto">
                      <v-img
                        :src="props.item.user_image"
                        width="25"
                        height="25"
                        class="rounded-circle"
                        alt="User Avatar"
                      />
                    </v-col>

                    <v-col class="d-flex align-center ml-2" cols="auto">
                      {{ props.item.assignee }}
                    </v-col>
                  </v-row>
                </td>
                <td>
                  {{ format_date(props.item.due_date) }}
                </td>
                <td>{{ filtered_labels(props.item.labels) }}</td>
                <td>
                  <v-chip
                    v-if="is_over_due(props.item.due_date) === 'Overdue'"
                    color="red"
                    text-color="white"
                    label
                  >
                    Overdue
                  </v-chip>
                  <span v-else>-</span>
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
        { text: "Ticket ID" },
        { text: "Ticket Name" },
        { text: "Priority" },
        { text: "Created " },
        { text: "Assignee" },
        { text: "Due Date" },
        { text: "Label" },
        { text: "Status" },
      ],
      data_result: [],
      filteredData: [],
      is_overdue: false,
      is_loading: false,
    };
  },

  methods: {
    is_over_due(start_date) {
      let result = "";
      const first_date = new Date(start_date);
      const current_date = new Date();
      //zamijeniti petlju
      if (start_date !== "-") {
        if (current_date > first_date) {
          this.is_overdue = true;
          return (result = "Overdue");
        } else {
          return (result = "-");
        }
      }
      return result;
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
      if (Array.isArray(labels)) {
        return labels.filter((label) => label !== "jira_escalated").join(", ");
      } else {
        return "-";
      }
    },
    async get_data() {
      this.is_loading = true;
      let api_url =
        "http://localhost:8010/proxy/rest/api/2/search?jql=project%20%3D%20PI%20AND%20assignee%20IS%20NOT%20EMPTY%20AND%20status%20%21%3D%20%22Done%22";
      const authHeader =
        "Basic " +
        btoa(process.env.VUE_APP_EMAIL + ":" + process.env.VUE_APP_API_KEY);

      const maxResults = 50;
      let totalIssues = [];

      try {
        const response = await this.$http({
          method: "GET",
          url: `${api_url}&startAt=0&maxResults=50`,
          headers: {
            Authorization: authHeader,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        const total = response.data.total;
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
        this.data_result = totalIssues.map((x) => ({
          ticket_id: x.key,
          ticket_name: x.fields.summary,
          priority: x.fields.priority.name,
          created_at: x.fields.created,
          assignee: x.fields.assignee.displayName,
          user_image: x.fields.assignee
            ? x.fields.assignee.avatarUrls["48x48"]
            : null,
          due_date: x.fields.duedate || "-",
          labels: x.fields.labels || "-",
        }));

        console.log("NEW DATA", this.data_result);
      } catch (error) {
        console.error("Error in fetching data:", error);
        this.is_loading = false;
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
