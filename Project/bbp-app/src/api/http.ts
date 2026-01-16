import axios from "axios";

export const http = axios.create({
  baseURL: "http://localhost:3000", // 你的 NestJS 地址
  withCredentials: true,
});
