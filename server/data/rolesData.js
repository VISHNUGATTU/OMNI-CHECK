const ROLES_DATA = [
  {
    category: "Software Engineering",
    roles: [
      {
        title: "Frontend Developer",
        skills: ["JavaScript", "TypeScript", "React", "HTML5 & CSS3", "State Management (Redux/Zustand)", "REST & GraphQL APIs", "Tailwind CSS", "Web Performance & SEO"]
      },
      {
        title: "Backend Developer",
        skills: ["Node.js", "Python", "Java", "RESTful APIs", "PostgreSQL / SQL", "MongoDB / NoSQL", "Microservices", "Docker", "System Design"]
      },
      {
        title: "Full Stack Developer",
        skills: ["JavaScript / TypeScript", "React", "Node.js", "Express", "SQL & NoSQL Databases", "REST APIs", "Git & CI/CD", "Cloud Basics"]
      },
      {
        title: "Mobile App Developer",
        skills: ["React Native", "Flutter", "iOS (Swift)", "Android (Kotlin)", "Mobile UI/UX", "REST APIs", "App Store Deployment", "Offline Storage"]
      },
      {
        title: "DevOps & Cloud Engineer",
        skills: ["Docker", "Kubernetes", "AWS / Azure / GCP", "CI/CD Pipelines (GitHub Actions/GitLab)", "Terraform (IaC)", "Linux Administration", "Monitoring (Prometheus/Grafana)", "Bash Scripting"]
      },
      {
        title: "QA & Automation Engineer",
        skills: ["Test Automation", "Selenium", "Cypress / Playwright", "Jest / Unit Testing", "Postman / API Testing", "Bug Tracking (Jira)", "Load & Performance Testing"]
      },
      {
        title: "Cybersecurity Engineer",
        skills: ["Network Security", "Vulnerability Scanning", "Penetration Testing", "OWASP Top 10", "Identity & Access Management (IAM)", "SIEM / Threat Detection", "Security Compliance"]
      }
    ]
  },
  {
    category: "Data & Artificial Intelligence",
    roles: [
      {
        title: "Data Analyst",
        skills: ["Python", "SQL", "Tableau / PowerBI", "Excel / Google Sheets", "Exploratory Data Analysis", "Data Cleaning", "Business Intelligence", "Statistical Analysis"]
      },
      {
        title: "Data Scientist",
        skills: ["Python", "Machine Learning", "Pandas & NumPy", "Scikit-Learn", "Statistical Modeling", "SQL", "Deep Learning (PyTorch/TensorFlow)", "Data Storytelling"]
      },
      {
        title: "Data Engineer",
        skills: ["SQL", "Python", "Apache Spark", "Airflow / ETL Pipelines", "Snowflake / BigQuery", "Kafka", "Data Warehousing", "Database Optimization"]
      },
      {
        title: "AI / Machine Learning Engineer",
        skills: ["Python", "PyTorch / TensorFlow", "Large Language Models (LLMs)", "Prompt Engineering & RAG", "Vector Databases (Pinecone/Chroma)", "MLOps", "Model Fine-tuning", "Hugging Face"]
      }
    ]
  },
  {
    category: "Product, Design & Agile",
    roles: [
      {
        title: "Product Manager",
        skills: ["Product Roadmapping", "User Story Writing", "Agile / Scrum", "Competitive Analysis", "A/B Testing", "KPI & Metric Analysis", "Stakeholder Management"]
      },
      {
        title: "UI/UX Designer",
        skills: ["Figma", "User Research", "Wireframing & Prototyping", "Design Systems", "Usability Testing", "Information Architecture", "Responsive Design"]
      },
      {
        title: "Technical Project Manager / Scrum Master",
        skills: ["Agile Methodologies", "Scrum Framework", "Jira & Confluence", "Sprint Planning", "Risk Management", "Cross-Functional Collaboration", "Team Velocity Tracking"]
      }
    ]
  },
  {
    category: "Business, Sales & People Operations",
    roles: [
      {
        title: "Business Analyst",
        skills: ["Business Process Modeling", "Requirement Gathering", "SQL Basics", "User Acceptance Testing (UAT)", "Gap Analysis", "Stakeholder Communication"]
      },
      {
        title: "HR Specialist / People Operations",
        skills: ["Talent Acquisition", "Employee Relations", "HRIS Management", "Performance Review Process", "Employment Law Basics", "Employee Engagement & Retention"]
      },
      {
        title: "Digital Marketing Specialist",
        skills: ["SEO & SEM", "Content Marketing", "Google Analytics", "Social Media Campaigns", "Email Marketing (HubSpot/Mailchimp)", "Conversion Rate Optimization (CRO)"]
      },
      {
        title: "B2B Sales & Account Executive",
        skills: ["CRM (Salesforce/HubSpot)", "B2B Sales Pipeline", "Lead Generation & Prospecting", "Client Relationship Management", "Contract Negotiation", "Revenue Forecasting"]
      }
    ]
  }
];

const ALL_ROLES = ROLES_DATA.flatMap((cat) => cat.roles);

const getSkillsForRole = (roleTitle) => {
  if (!roleTitle) return [];
  const found = ALL_ROLES.find(
    (r) => r.title.toLowerCase().trim() === roleTitle.toLowerCase().trim()
  );
  return found ? found.skills : [];
};

module.exports = { ROLES_DATA, ALL_ROLES, getSkillsForRole };
