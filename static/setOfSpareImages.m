keep = readtable('sampImagesInfo.csv');

bigDir = '../../..//Stimuli/lamem/goodResImages/';
bigList = dir(bigDir);

bigList = bigList(3:end,:);

for ii = 1:length(bigList)
    thisImg = bigList(ii).name;
    if ~sum(ismember(keep.name, thisImg))
        copyfile([bigDir thisImg], ['./images/spare/' thisImg]);
    end
end