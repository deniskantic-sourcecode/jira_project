<template>
  <v-app style="width: 100%; max-height: 100vh" class="pa-0">
    <div v-if="is_loading">Loading...</div>

    <div style="width: 100; height: 100%">
      <v-row v-if="!is_loading">
        <v-col cols="12" align="center">
          <v-data-table
            class="elevation-1"
            :headers="headers"
            :items="data_result"
            item-key="id"
            hide-default-footer
          >
            <template v-if="!is_loading" v-slot:item="props">
              <tr align="center">
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
                      {{ props.item.username }}
                    </v-col>
                  </v-row>
                </td>
                <td>{{ props.item.total_count }}</td>
                <td>
                  {{ props.item.statusCounts.open }}
                </td>
                <td>
                  {{ props.item.statusCounts.work_in_progress }}
                </td>

                <td>{{ props.item.statusCounts.waiting_for_support }}</td>
                <td>
                  {{ props.item.statusCounts.waiting_on_client }}
                </td>
                <td>{{ props.item.statusCounts.ready_for_production }}</td>
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
        { text: "User" },
        { text: "Tickets total" },
        { text: "Open" },
        { text: "Work in progress" },
        { text: "Waiting on support" },
        { text: "Waiting on client" },
        { text: "Ready for production" },
      ],
      data_result: [],
      filteredData: [],
      is_loading: false,
    };
  },

  methods: {
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
