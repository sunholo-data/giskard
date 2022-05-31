import axios from 'axios';
import {apiURL} from '@/env';
import {getLocalToken, removeLocalToken} from '@/utils';
import Vue from "vue";

import {
    AdminUserDTO,
    AppConfigDTO,
    CodeTestCollection,
    CreateFeedbackDTO,
    CreateFeedbackReplyDTO,
    DatasetDTO,
    ExplainResponseDTO,
    FeatureMetadataDTO,
    FeedbackDTO,
    FeedbackMinimalDTO,
    InspectionCreateDTO,
    InspectionDTO,
    JWTToken,
    ManagedUserVM,
    MessageDTO,
    ModelDTO,
    PasswordResetRequest,
    PredictionDTO,
    ProjectDTO,
    ProjectPostDTO,
    RoleDTO,
    TestDTO,
    TestExecutionResultDTO,
    TestSuiteCreateDTO,
    TestSuiteDTO,
    TokenAndPasswordVM,
    UpdateMeDTO,
    UpdateTestSuiteDTO,
    UserDTO
} from '@/generated-sources';
import {TYPE} from "vue-toastification";
import ErrorToast from "@/views/main/utils/ErrorToast.vue";
import router from "@/router";
import {commitSetLoggedIn, commitSetToken} from "@/store/main/mutations";
import store from "@/store";
import AdminUserDTOWithPassword = AdminUserDTO.AdminUserDTOWithPassword;

function jwtRequestInterceptor(config) {
    // Do something before request is sent
    let jwtToken = getLocalToken();
    if (jwtToken && config && config.headers) {
        config.headers.Authorization = `Bearer ${jwtToken}`;
    }
    return config;
}

function authHeaders(token: string | null) {
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
}

const API_V2_ROOT = `${apiURL}/api/v2`;

const axiosProject = axios.create({
    baseURL: `${API_V2_ROOT}/project`
});
const apiV2 = axios.create({
    baseURL: API_V2_ROOT
});

function unpackInterceptor(response) {
    return response.data;
}

function errorInterceptor(error) {
    let errorResponseData = error.response.data;
    Vue.$toast(
        {
            component: ErrorToast,
            props: {
                title: errorResponseData.title,
                detail: errorResponseData.detail
            }

        },
        {
            type: TYPE.ERROR,
        });
    if (error.response.status === 401) {
        removeLocalToken();
        commitSetToken(store, '');
        commitSetLoggedIn(store, false);
        if (router.currentRoute.path !== '/auth/login') {
            router.push('/auth/login');
        }
    }
    return Promise.reject(error);
}


apiV2.interceptors.response.use(unpackInterceptor, errorInterceptor);
apiV2.interceptors.request.use(jwtRequestInterceptor);

axios.interceptors.request.use(jwtRequestInterceptor);

// this is to automatically parse responses from the projects API, be it array or single objects
axiosProject.interceptors.response.use(resp => {
    if (Array.isArray(resp.data)) {
        resp.data.map(p => p.created_on = new Date(p.created_on));
    } else if (resp.data.hasOwnProperty('created_on')) {
        resp.data.created_on = new Date(resp.data.created_on);
    }
    return resp;
});
axiosProject.interceptors.response.use(unpackInterceptor, errorInterceptor);
axiosProject.interceptors.request.use(jwtRequestInterceptor);


function downloadURL(urlString) {
    let url = new URL(urlString);
    let token = getLocalToken();
    if (token) {
        url.searchParams.append('token', token);
    }
    let hiddenIFrameID = '_hidden_download_frame_',
        iframe: HTMLIFrameElement = <HTMLIFrameElement>document.getElementById(hiddenIFrameID);
    if (iframe == null) {
        iframe = document.createElement('iframe');
        iframe.id = hiddenIFrameID;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }
    iframe.src = url.toString();
}


export const api = {
    async logInGetToken(username: string, password: string) {
        return await apiV2.post<unknown, JWTToken>(`/authenticate`, {username, password});
    },
    async getMe() {
        return await apiV2.get<unknown, AppConfigDTO>(`/account`);
    },
    async updateMe(data: UpdateMeDTO) {
        return await apiV2.put<unknown, AdminUserDTO>(`/account`, data);
    },
    async getUsers() {
        return await apiV2.get<unknown, AdminUserDTO[]>(`/admin/users`);
    },
    async getRoles() {
        return await apiV2.get<unknown, RoleDTO[]>(`/roles`);
    },
    async updateUser(data: Partial<AdminUserDTOWithPassword>) {
        return await apiV2.put<unknown, AdminUserDTO.AdminUserDTOWithPassword>(`/admin/users`, data);
    },
    async createUser(data: AdminUserDTOWithPassword) {
        return await apiV2.post<unknown, AdminUserDTO>(`/admin/users/`, data);
    },
    async signupUser(userData: ManagedUserVM) {
        return await apiV2.post<unknown, void>(`/register`, userData);
    },
    async deleteUser(userId: number) {
        return await apiV2.delete<unknown, void>(`/admin/users/${userId}`);
    },
    async passwordRecovery(email: string) {
        return await apiV2.post<unknown, void>(`/account/password-recovery`, <PasswordResetRequest>{email});
    },
    async resetPassword(password: string) {
        return await apiV2.post<unknown, void>(`/account/reset-password`, <TokenAndPasswordVM>{
            newPassword: password
        });
    },
    async getSignupLink() {
        return await apiV2.get<unknown, string>(`/signuplink`);
    },
    async inviteToSignup(email: string) {
        const params = new URLSearchParams();
        params.append('email', email);

        return await apiV2.post<unknown, void>(`/users/invite`, params);
    },
    async getCoworkersMinimal() {
        return await apiV2.get<unknown, UserDTO[]>(`/users/coworkers`);
    },
    async getApiAccessToken() {
        return await apiV2.get<unknown, JWTToken>(`/api-access-token`);
    },

    // Projects
    async getProjects() {
        return await axiosProject.get<unknown, ProjectDTO[]>(`/`);
    },
    async getProject(id: number) {
        return await axiosProject.get<unknown, ProjectDTO>(`/${id}`);
    },
    async createProject(data: ProjectPostDTO) {
        return await axiosProject.post<unknown, ProjectDTO>(`/`, data);
    },
    async deleteProject(id: number) {
        return await axiosProject.delete<unknown, ProjectDTO>(`/${id}`);
    },
    async editProject(id: number, data: ProjectPostDTO) {
        return await axiosProject.put<unknown, ProjectDTO>(`/${id}`, data);
    },
    async inviteUserToProject(projectId: number, userId: number) {
        return await axiosProject.put<unknown, ProjectDTO>(`/${projectId}/guests/${userId}`, null);
    },
    async uninviteUserFromProject(projectId: number, userId: number) {
        return await axiosProject.delete<unknown, ProjectDTO>(`/${projectId}/guests/${userId}`);
    },
    // Models
    async getProjectModels(id: number) {
        return await axiosProject.get<unknown, ModelDTO[]>(`/${id}/models`);
    },
    async deleteDatasetFile(datasetId: number) {
        return await apiV2.delete<unknown, MessageDTO>(`/dataset/${datasetId}`);
    },
    async deleteModelFiles(modelId: number) {
        return await apiV2.delete<unknown, MessageDTO>(`/models/${modelId}`);
    },
    downloadModelFile(id: number) {
        downloadURL(`${API_V2_ROOT}/download/model/${id}`);
    },
    downloadDataFile(id: number) {
        downloadURL(`${API_V2_ROOT}/download/dataset/${id}`);
    },
    async peekDataFile(datasetId: number) { //TODO
        return await apiV2.get<unknown, any>(`/dataset/${datasetId}/rows`, {params: {offset: 0, size: 10}});
    },
    async getFeaturesMetadata(datasetId: number) {
        return await apiV2.get<unknown, FeatureMetadataDTO[]>(`/dataset/${datasetId}/features`);
    },
    async getDataFilteredByRange(inspectionId, props, filter) {
        return await apiV2.post<unknown, any>(`/inspection/${inspectionId}/rowsFiltered`, filter, {params: props});
    },
    async getLabelsForTarget(inspectionId: number) {
        return await apiV2.get<unknown, string[]>(`/inspection/${inspectionId}/labels`);
    },
    async getProjectDatasets(id: number) {
        return await axiosProject.get<unknown, DatasetDTO[]>(`/${id}/datasets`);
    },
    async getInspection(inspectionId: number) {
        return await apiV2.get<unknown, InspectionDTO>(`/inspection/${inspectionId}`);
    },
    async uploadDataFile(projectKey: string, fileData: any) {
        const formData = new FormData();
        formData.append('metadata',
            new Blob([JSON.stringify({"projectKey": projectKey})], {
                type: "application/json"
            }));
        formData.append('file', fileData);
        const config = authHeaders(getLocalToken());
        config.headers['content-type'] = 'multipart/form-data';
        return await apiV2.post<unknown, DatasetDTO>(`/project/data/upload`, formData, config);
    },
    async predict(modelId: number, inputData: object) {
        return await apiV2.post<unknown, PredictionDTO>(`/models/${modelId}/predict`, {features: inputData});
    },

    async prepareInspection(payload: InspectionCreateDTO) {
        return await apiV2.post<unknown, InspectionDTO>(`/inspection`, payload);
    },
    async explain(modelId: number, datasetId: number, inputData: object) {
        return await apiV2.post<unknown, ExplainResponseDTO>(`/models/${modelId}/explain/${datasetId}`, {features: inputData});
    },
    async explainText(modelId: number, inputData: object, featureName: string) {
        return await apiV2.post<unknown, { [key: string]: string }>(`/models/${modelId}/explain-text/${featureName}`, {features: inputData});
    },
    // feedbacks
    async submitFeedback(payload: CreateFeedbackDTO, projectId: number) {
        return await apiV2.post<unknown, void>(`/feedbacks/${projectId}`, payload);
    },
    async getProjectFeedbacks(projectId: number) {
        return await apiV2.get<unknown, FeedbackMinimalDTO[]>(`/feedbacks/all/${projectId}`);
    },
    async getFeedback(id: number) {
        return await apiV2.get<unknown, FeedbackDTO>(`/feedbacks/${id}`);
    },
    async replyToFeedback(feedbackId: number, content: string, replyToId: number | null = null) {
        return await apiV2.post<unknown, void>(`/feedbacks/${feedbackId}/reply`,
            <CreateFeedbackReplyDTO>{
                content,
                replyToReply: replyToId
            });
    },
    async getTestSuites(projectId: number) {
        return await apiV2.get<unknown, Array<TestSuiteDTO>>(`/testing/suites/${projectId}`);
    },
    async getTests(suiteId: number) {
        return await apiV2.get<unknown, Array<TestDTO>>(`/testing/tests`, {params: {suiteId}});
    },
    async getTestSuite(suiteId: number) {
        return await apiV2.get<unknown, TestSuiteDTO>(`/testing/suite/${suiteId}`);
    },
    async deleteTestSuite(suiteId: number) {
        return await apiV2.delete<unknown, TestSuiteDTO>(`/testing/suite/${suiteId}`);
    },
    async createTestSuite(data: TestSuiteCreateDTO) {
        return await apiV2.post<unknown, TestSuiteDTO>(`/testing/suites`, data);
    },
    async saveTestSuite(testSuite: UpdateTestSuiteDTO) {
        return await apiV2.put<unknown, TestSuiteDTO>(`/testing/suites`, testSuite);
    },
    async getTestDetails(testId: number) {
        return await apiV2.get<unknown, TestDTO>(`/testing/tests/${testId}`);
    },
    async getCodeTestTemplates() {
        return await apiV2.get<unknown, CodeTestCollection[]>(`/testing/tests/code-test-templates`);
    },

    async deleteTest(testId: number) {
        return await apiV2.delete<unknown, TestSuiteDTO>(`/testing/tests/${testId}`);
    },
    async saveTest(testDetails: TestDTO) {
        return await apiV2.put<unknown, TestDTO>(`/testing/tests`, testDetails);
    },
    async runTest(testId: number) {
        return await apiV2.post<unknown, TestExecutionResultDTO>(`/testing/tests/${testId}/run`);
    },
    async createTest(suiteId: number, name: string) {
        return await apiV2.post<unknown, TestDTO>(`/testing/tests`, {
            name: name,
            suiteId: suiteId
        });
    },
    async executeTestSuite(suiteId: number) {
        return await apiV2.post<unknown, Array<TestExecutionResultDTO>>(`/testing/suites/execute`, {suiteId});
    }
};
