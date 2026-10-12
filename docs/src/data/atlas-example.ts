// Example CV for the Atlas pages. John Doe and every institution here are example content.
export interface ExampleStop {
  title: string; org: string; kind: string; place: string; lat: number; lon: number;
  from: string; to?: string; text: string;
}

export const stops: ExampleStop[] = [
  { title: "Visiting researcher", org: "Example Institute", kind: "Academia", place: "Cape Town, South Africa", lat: -33.92, lon: 18.42, from: "2025-09", to: "2025-12",
    text: "Three months with a group that studies sheaf neural networks. We tested learned restriction maps on traffic and power-grid graphs." },
  { title: "Research intern", org: "Example Lab", kind: "Work", place: "Tokyo, Japan", lat: 35.68, lon: 139.69, from: "2024-06", to: "2024-09",
    text: "Built a benchmark for message passing on 3D meshes, and the small library that loads it." },
  { title: "PhD in Computer Science", org: "Example University", kind: "Academia", place: "Edinburgh, United Kingdom", lat: 55.95, lon: -3.19, from: "2022-09", to: "now",
    text: "Neural networks for data where one relation joins more than two things: simplicial complexes, cell complexes, and sheaves. Teaching assistant for the graduate machine learning course." },
  { title: "Machine learning engineer", org: "Example Company", kind: "Work", place: "Lisbon, Portugal", lat: 38.72, lon: -9.14, from: "2021-07", to: "2022-08",
    text: "Graph models for search ranking over a large product catalogue, from the first prototype to the version in production." },
  { title: "MSc in Computer Science", org: "Example Institute of Technology", kind: "Education", place: "Toronto, Canada", lat: 43.65, lon: -79.38, from: "2019-09", to: "2021-06",
    text: "Thesis on why deep message passing networks over-smooth, and two ways to slow it down." },
  { title: "Exchange semester", org: "Example University", kind: "Education", place: "Santiago, Chile", lat: -33.45, lon: -70.67, from: "2018-02", to: "2018-07",
    text: "Courses in optimization and probability, taught in Spanish." },
  { title: "BSc in Mathematics", org: "Example University", kind: "Education", place: "Lisbon, Portugal", lat: 38.72, lon: -9.14, from: "2016-09", to: "2019-07",
    text: "Final project on spectral graph theory: what the eigenvalues of a graph's Laplacian say about its shape." },
];
