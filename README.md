# Project of Data Visualization (COM-480)

| Student's name     | SCIPER |
|-------------------|--------|
| Mohamed Bouchnak  | 327170 |
| Hugo Heinkélé     | 326309 |
| Hong Wei          | 422972 |
| Gustavo Maia      | 357154 |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (20th March, 5pm)

**10% of the final grade**

This is a preliminary milestone to define the goals of the project and assess the feasibility of the chosen idea.

*(max. 2000 characters per section)*


## Dataset
> Find a dataset (or multiple) that you will explore. Assess the quality of the data it contains and how much preprocessing / data-cleaning it will require before tackling visualization.
>
> Hint: some good pointers for finding quality publicly available datasets (Google dataset search, Kaggle, etc.).

The dataset used in this project comes from the NASA Exoplanet Archive and contains detailed information about confirmed exoplanets and their host stars. Each row corresponds to a detected exoplanet, with features describing both the planet and the star it orbits.
The dataset includes key variables such as planet mass (`pl_bmasse`), radius (`pl_rade`), orbital period (`pl_orbper`), equilibrium temperature (`pl_eqt`), and discovery method (`discoverymethod`). It also contains information about the host star, such as its mass, radius, and effective temperature.
This dataset is widely used in scientific research and provides a large number of observations, making it suitable for identifying patterns and relationships between planetary and stellar properties.
However, the dataset contains missing values and some inconsistencies, which will require preprocessing (e.g., filtering relevant features and handling missing data) before performing meaningful analysis and visualization.

Dataset: https://exoplanetarchive.ipac.caltech.edu/cgi-bin/TblView/nph-tblView?app=ExoTbls&config=PS&constraint=default_flag=1&constraint=disc_facility+like+%27%25TESS%25%27


## Problematic
> Frame the general topic of your visualization and the main axis that you want to develop.
>
> - What am I trying to show with my visualization?
> - Think of an overview for the project, your motivation, and the target audience.

The main objective of this project is to explore how exoplanets differ from each other and to understand how common Earth-like planets are within the currently known population. Through our visualizations, we aim to highlight the distribution of key characteristics such as planet mass, radius, orbital period, and temperature, and to identify where Earth-like planets are located within these distributions.
More specifically, we want to show whether planets similar to Earth are rare or simply underrepresented due to current detection methods. By comparing different features and observing potential patterns or clusters, we aim to better understand the diversity of exoplanets and the limits of current observations.
Our motivation comes from the increasing interest in discovering habitable planets and understanding our place in the universe. This project is intended for a general audience with basic knowledge of science, as well as students interested in astronomy and data visualization. The goal is to present complex astronomical data in a clear, intuitive, and visually engaging way.


## Exploratory Data Analysis
> Pre-processing of the data set you chose
>
> - Show some basic statistics and get insights about the data

Before performing visualizations, we will preprocess the dataset by handling missing values and selecting the most relevant features (such as planet mass, radius, and orbital period). We will also ensure consistency in units when necessary.
We will then compute basic statistics (mean, median, distribution) and visualize key variables to better understand the structure of the data. This step will help identify patterns, outliers, and potential relationships between variables, which will guide the rest of the analysis.
All preprocessing and analysis steps will be implemented in the `analysis.ipynb` notebook.


## Related Work
> - What others have already done with the data?
> - Why is your approach original?
> - What source of inspiration do you take? Visualizations that you found on other websites or magazines (might be unrelated to your data).
> - In case you are using a dataset that you have already explored in another context, you are required to share the report of that work to outline the differences with the submission for this class.

Previous work on exoplanet datasets has mainly focused on classifying planets based on their physical properties (such as mass and radius), studying detection methods, and identifying general trends in exoplanet populations. Many visualizations highlight the diversity of exoplanets or compare discovery techniques (e.g., transit vs radial velocity). For this milestone, we have identified these common approaches but have not yet conducted an in-depth comparison with specific prior studies. This will be developed in later stages of the project.
Our approach is original in that we focus specifically on identifying Earth-like planets and analyzing how their apparent rarity may be influenced by detection biases. Instead of only describing the dataset, we aim to combine multiple features (such as size, temperature, and orbital characteristics) to better understand where Earth-like planets lie within the overall distribution.
In terms of inspiration, we draw from existing scientific visualizations and online platforms that present astronomical data in an accessible and interactive way. This includes space-related dashboards, educational visualizations, and data storytelling websites that emphasize clarity and visual exploration.
We are not reusing a dataset previously explored in another course or project.


## Milestone 2 (17th April, 5pm)

**10% of the final grade**


## Milestone 3 (29th May, 5pm)

**80% of the final grade**


## Late policy

- < 24h: 80% of the grade for the milestone  
- < 48h: 70% of the grade for the milestone  
