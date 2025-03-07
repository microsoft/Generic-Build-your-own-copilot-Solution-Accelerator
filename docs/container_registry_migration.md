# Guide: Migrating Azure Web App Service to a New Container Registry

## Overview

### Current Problem:
- The **Document Generator Container Image** is being published in the **External ACR** (Azure Container Registry).

### Goal:
- The goal is to **migrate container images** from various applications to a common **CSA CTO Production Azure Container Registry**, ensuring all the different images are consolidated in one centralized location.

---

## Step-by-Step Guide: Migrating Azure Web App Service to a New Container Registry

This guide will help you seamlessly switch the container registry for your **Azure Web App Service** from Azure Container Registry (ACR) to the new registry **`byocgacontainerreg`**.

Follow the steps below to ensure a smooth migration.

### Prerequisites:
Before you begin, ensure you have the following:
- Access to the **Azure Portal**.
- The **container image** in the new registry is ready and accessible.

---

### Step 1: Obtain Details for the New Registry

Before you begin, ensure you have the following information:
- **Registry URL**: The URL of the new registry (`https://byocgacontainerreg.azurecr.io`).
- **Image Name and Tag**: The full name and tag of the image you want to use:
  - **Web App Image**: `webapp:latest`
---

### Step 2: Update Azure Web App Service Configuration Using Azure Portal

1. **Log in to Azure Portal**:
   - Open [Azure Portal](https://portal.azure.com/).

2. **Locate Your Resource Group and Web App Service**:
   - Navigate to resource group which you have created for Document Generator.
   - Navigate to **Web App Service**: From the list of resources, find and select **App Service**

3. **Go to the Deployment Center**:
   - In the left-hand menu, click on **Deployment**.

  ![Resource Menu](images/resource_menu.png)


4. **Update Image Source**:
   - Change the **Registry Source** to **Private**.
   - Set the **Server URL** to the new container registry (`https://byocgacontainerreg.azurecr.io`), as shown in the screenshot below.
   - Set the **Full Image name** to the relevant image name and tag:
     - For Web App: `webapp:latest`

   ![Deployment Center](images/deployment_center.png)

5. **Save Changes**:
   - Click **Save** to save the configuration.

---

### Step 3: Restart the Web App Service

After updating the configuration, restart your **Web App Service** to apply the changes:

1. In the **Web App Service overview page**, click on **Restart**.
2. Confirm the restart operation.

---

### Step 8: Validate the Deployment

1. **Access Your Web App**:
   - Open the **Web App URL** in a browser to ensure it’s running correctly.
---

By following these steps, your **Azure Web App Service** will now use the new container from the **Document Generator registry**.

For further assistance, feel free to reach out to your support team or log an issue on GitHub.

---
