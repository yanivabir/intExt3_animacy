function [randomizedIm, randomizationMask]=randomizeFourierPhase(im)
%RANDOMIZEFOURIERPHASE Scrambles the Fourier phases of a color image. 
%
% im should be a (double) image matrix. 
% output is always in double format.
%
% usage example:
% im=imread('example.jpg');
% imwrite(randomizeFourierPhase(im),'scrambled.jpg','jpg');
%
% updated 25/12/15, Tal Golan, golantl@gmail.com

if ~isa(im,'double')
    warning('expecting image as a double matrix, converting.');
    im=im2double(im);
end

%declare variables
F=nan(size(im));
randomizedF=F;
randomizedIm=F;

% build random phases mask
randomizationMask=randn(size(im,1),size(im,2)); %white noise
randomizationMask=fft2(randomizationMask); % Fourier transform
randomizationMask=randomizationMask./abs(randomizationMask); % now all the Fourier amplitudes are uniformly one

for c=1:size(F,3) % loop over RGB components    
    F(:,:,c)=fft2(im(:,:,c));    
    randomizedF(:,:,c)=F(:,:,c).*randomizationMask; % critically, the same mask has to be used for the different components
    randomizedIm(:,:,c)=abs(ifft2(randomizedF(:,:,c)));
end

randomizedIm=min(max(randomizedIm,0),1);