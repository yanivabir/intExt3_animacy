# intExt3_animacy

## How to create and sample stimuli for this experiment:

### Set up
1. Use sortByRes.m to keep only images with 3/4 aspect ration and resolution above 2e5.
2. Use categorizeImages.m to classify by animacy, and reject images.
3. Use removeByInfo.m to delete rejected images.
4. Use downSampleImages.m to unify resolution to 2e5.
5. Use getMemScore.m to create info csv for images.

### Sample
1. Use equateHistograms.R to sample stimuli for main block
2. Use makeScrambles.m to make scrambles.
3. Use compression app to reduce file size.
