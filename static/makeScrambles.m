d = '/Users/yanivabir 1/Desktop/training images/';
list = dir(d);

list = list(3:end,:);

keep = readtable([d 'train_images.csv']);
keep.Properties.RowNames = keep.name;

for ii = 1:length(list)
    thisImg = list(ii).name;
    if sum(isletter(thisImg)) <= 3
        img = imread([d thisImg]);
        scr = randomizeFourierPhase(img);
        imwrite(scr, [d thisImg(1:end-4) '_s.jpg']);
        
    end
end

