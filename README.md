RASDv1 document google drive link 

https://docs.google.com/document/d/1Fhfc2yA11HIm2HANGmPN5jokYgust4FRiRzOdUqyz8Y/edit?usp=sharing


DDv1 document google drive link 

https://docs.google.com/document/d/1WYcsEtqAeJdDAIk7tX7Rhuet-7AUkzyd2dj8IZTQ9KE/edit?usp=sharing


RASDv2 document google drive link

https://docs.google.com/document/d/1NaGrld2hdxbTRszL9qhFpfDRPHhQbxbypxXEmz76Xlg/edit?tab=t.0


DDv2 document google drive link

https://docs.google.com/document/d/1KtbkM9oVBvlsXyNmTB15tlqXkShmHq8FB-4BCQPSyGI/edit?tab=t.0


ITDv1 document google drive link

https://docs.google.com/document/d/1_X-otNjImV17NjD7g-b-YX7rR2AhXKwC3hgAkLEb_FY/edit?tab=t.0

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

Best Bike Paths (BBP) – Prototype Implementation

This repository contains the prototype implementation of the Best Bike Paths (BBP) system, developed for the Software Engineering II course (A.Y. 2025–2026).

The prototype can be executed either: online, through a publicly available deployment, or locally, by installing and running the backend and frontend components.


1. Online Deployment (Recommended for Quick Evaluation)

The BBP prototype is available online at the following address:

https://zheng-yang-dai.vercel.app

This deployment allows evaluators and users to directly interact with the system without requiring any local installation. All core functionalities implemented in the prototype can be accessed through the web interface.


2. Local Installation and Execution

Local installation is provided to ensure reproducibility and independence from the availability of the online deployment.

2.1 Prerequisites

- Node.js (version 18 or later)

- npm

- Git

2.2 Clone the Repository

2.3 Backend Setup

Navigate to the backend directory and install the required dependencies:

- cd backend

- npm install

- npm install prisma@5

- npx prisma generate

- npx prisma migrate deploy


Start the backend service:

- npm run start:dev


The backend service will start and listen for incoming HTTP(S) requests.

2.4 Frontend Setup

Open a new terminal window, navigate to the frontend directory, and install the required dependencies:

- cd frontend

- npm install


Start the frontend application:

- npm run dev


Once started, the frontend will be accessible via a local development server (e.g., http://localhost:3000).

3. Notes

The online deployment and the local installation correspond to the same prototype version.

Local execution is intended primarily for evaluation and testing purposes.

Database migrations are handled automatically through Prisma during backend setup.

For testing purposes, a dedicated .env configuration file is required.

Due to security reasons, this file is not included in the public repository.

To obtain a test version of the .env file, please contact the project authors.
