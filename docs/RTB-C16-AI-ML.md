# UI/UX - RTB C16 – AI & ML

## Manual & Case Study

### Skill Manual

#### Objective

- Readiness of an individual to be deployed on a project for AI & ML application development work
- Be able to share knowledge/updates with the group/organization around AI & ML
- Ability to share estimates for application/products based on AI & ML

---

#### Topics To Cover

##### Milestone – 1: Introduction to AI and ML

**AI & ML Topic and Content**

- Overview of AI and ML Python code
- Types of AI (Narrow, General, and Superintelligent)
- Types of ML (Supervised, Unsupervised, and Reinforcement Learning)
- Key Terminologies (Algorithm, Model, dataset, Training, Testing, Features, Labels, and neural networks)
- AI and ML in Frontend Development - Use Cases and Applications like ecommerce, healthcare, social media etc.

**Exercise:**
Research and present a real-world application of AI/ML in frontend development.

**Assignment:**
Present your learning on how AI/ML can transform the user experience in web applications.

---

##### Milestone – 2: Python for AI/ML

**Topics and Content**

- Introduction to Python Programming
- Python Libraries for AI/ML (NumPy, Pandas, Matplotlib, Seaborn)
- Data Structures in Python (Lists, Tuples, Dictionaries, Sets)
- Functions and Modules in Python
- Basic Statistics for Data Analysis
- Jupyter Notebooks for Experimentation

**Exercise:**
Write Python scripts to perform basic data manipulations (update csv data, delete rows, update rows, add data) using NumPy and Pandas.

**Assignment:**
Create a Jupyter Notebook to analyze a simple dataset and visualize the results.

---

##### Milestone – 3: Data Preprocessing

**Topics and Content**

- Understanding Data Types and Formats
- Data Cleaning (Handling Missing Values, Removing Duplicates, outlier detection and data imputation)
- Data Transformation (Normalization, Standardization)
- Feature Engineering (Creating New Features, Encoding Categorical Variables)
- Data Splitting (Train-Test Split, Cross-Validation)
- Introduction to Data Preprocessing Libraries (scikit-learn, Pandas)

**Exercise:**
Clean and preprocess a raw dataset (e.g., removing null values, encoding categorical variables, outlier detection, Normalizing data, Feature engineering steps like encoding, selection, new variables, test-train split etc. and Data correction).

**Assignment:**
Prepare a cleaned and preprocessed dataset ready for ML model training and create a Jupyter Notebook documenting the steps.

---

##### Milestone – 4: Machine Learning Fundamentals

**Topics and Content**

- Understanding the ML Pipeline (Data Collection, Preprocessing, Model Building, Evaluation)
- Introduction to Supervised Learning (Regression, Classification)
- Introduction to Unsupervised Learning (Clustering, Dimensionality Reduction)
- Model Evaluation Metrics (For classification: Accuracy, Precision, recall, F1-score, ROC curves, and AUC. For regression: mean squared error (MSE), root mean squared error (RMSE), and R-squared)
- Overfitting and Underfitting
- Hyperparameter Tuning and Model Optimization

**Exercise:**
Implement a basic regression or classification model using scikit-learn.
Explore this data set for supervised learning example and perform all preprocessing and feature engineering steps for this: <https://www.kaggle.com/datasets/jsphyg/weather-dataset-rattle-package>
Train the above models using regression model and calculate accuracy using root mean square. Save your notebook and submit.

**Assignment:**
Train a machine learning model on a dataset and evaluate its performance using appropriate metrics. Document the process in a Jupyter Notebook.

---

##### Milestone – 5: Integrating AI/ML with UI

**Topics and Content**

- Using AI/ML Models in Frontend Applications – Connect your UI to an AI/ML model or service using flask. Implement AI-driven functionality in the UI.
- REST APIs and Web Services for ML Model Deployment
- Building Intelligent UI Components - Real-time Feedback: Implement real-time feedback from the AI/ML model to the UI component.

**Exercise:**
Create a simple frontend application that consumes an ML model's predictions via a REST API.

**Assignment:**
Develop a mini-project where an ML model's functionality is integrated into a frontend application. For example, a recommendation system or a chatbot that interacts with users.

---

#### Expectations

Team Members post the intervention should be able to conduct knowledge sharing session and complete the Assessments. We will be sharing the mode of assessments in the group/team level meeting.

---

---

### Case Study

#### Problem Statement / Use Case

**Objective:** New York City Taxi Fare Prediction
We'll train a machine learning model to predict the fare for a taxi ride in New York city given information like pickup date & time, pickup location, drop location and no. of passengers.

**Description:** You are tasked with predicting the fare amount (inclusive of tolls) for a taxi ride in New York City given the pickup and drop off locations. While you can get a basic estimate based on just the distance between the two points.

**Evaluation:** You need to find the best machine learning library to reduce the loss and make correct predictions. Make a UI for it which will take inputs as latitude, longitude, time, day, etc and give us the predicted price on UI. We can even show graphs and charts on UI. Here you can consider RMSE (Root mean squared error) for evaluating.

1. **Download the dataset:**
   - a. `import opendatasets as od`
   - b. `dataset_url = 'https://www.kaggle.com/c/new-york-city-taxi-fare-prediction/overview'`
   - c. `od.download(dataset_url)`
   - d. `data_dir = './new-york-city-taxi-fare-prediction'`
2. **Dataset files are as follows:**
   - a. `{data_dir/train.csv}`
   - b. `{data_dir/test.csv}`
   - c. `{data_dir/sample_submission.csv}`
3. Training data is 5.5 GB in size
4. Training data has 5.5 million rows
5. Test set is much smaller (< 10,000 rows)
6. The submission file should contain the key and fare_amount for each test sample.
7. **Loading training set:**
   - a) Loading the entire dataset into Pandas is going to be slow, so we can use the following optimizations:
   - b) Work with 1% sample of data only for now

#### Model Explanation

1. `key` - Unique string identifying each row in both the training and test sets
2. `pickup_datetime` - timestamp value indicating when the taxi ride started.
3. `pickup_longitude` - float for longitude coordinate of where the taxi ride started.
4. `pickup_latitude` - float for latitude coordinate of where the taxi ride started.
5. `dropoff_longitude` - float for longitude coordinate of where the taxi ride ended.
6. `dropoff_latitude` - float for latitude coordinate of where the taxi ride ended.
7. `passenger_count` - integer indicating the number of passengers in the taxi ride.

#### Target

1. `fare_amount` - float dollar amount of the cost of the taxi ride. This value is only in the training set; this is what you are predicting in the test set.

#### Outcomes to be determined

1. Explore the dataset, find all the basic information. Make a note of all the relevant information that you might need for achieving the goal. Example - data is error free, no missing values etc.
2. Exploratory data analysis and visualization.
   - a. Create graphs (histograms, line charts, bar charts, scatter plots, box plots, geo maps etc.) to study the distribution of values in each column, and the relationship of each input column to the target.
   - b. Ask & answer questions about the dataset:
     - i. What is the busiest day of week
     - ii. Busiest time of the day
     - iii. Which months are fares the highest
     - iv. Which drop locations have the highest fares
     - v. Average ride distance
3. Prepare data set for training
   - a. Split training and validation set
   - b. Add/remove missing values
   - c. Extract input-output
4. Train hardcoded and baseline models
   - a. Hardcoded model – always predict average fare
   - b. Baseline model – Linear regression
5. Make predictions
6. Do Feature engineering steps
7. Train and evaluate Different models
8. Submit your work, document it.
