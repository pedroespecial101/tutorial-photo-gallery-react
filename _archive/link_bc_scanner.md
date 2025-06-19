Can we now link the Barcode Scanner results with the rest of the process.
Currently we have the SKU hardcoded. Let's make the SKU be the one that has been scanned on the first tab.

We will have to add a check on the Upload Tab to make sure a barcode has been scanned before allowing upload. Please also implement a format check function which checks the scanned barcode is of the right format before allowing it to be uploaded. This can be simple as < 10 chars right now.

I do not want the format check fundtion to be implemented at the scanner tab because I am playing with scanning EAN-13 codes for another idea. BUT, only < 10char SKU values are valid for upload. I may make this requirement more comlplex later so use REGEX so I can change it myself.

Use the same session maanagement to reset any scannmed barcodes along with the resetting of images which is already implemented. 