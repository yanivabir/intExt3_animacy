
list = dir('./images');

list = list(3:end,:);

keep = readtable('sampImagesInfo.csv');
keep.Properties.RowNames = keep.name;

for ii = 1:length(list)
    thisImg = list(ii).name;
    if sum(isletter(thisImg)) <= 3
        if ~sum(ismember(keep.name, thisImg))
            delete(['./images/' thisImg]);
        else
            img = imread(['./images/' thisImg]);
            scr = randomizeFourierPhase(img);
            imwrite(scr, ['./images/' thisImg(1:end-4) '_s.jpg']);
        end
    end
end

