from sigma.processing.pipeline import ProcessingPipeline, ProcessingItem
from sigma.processing.transformations import FieldMappingTransformation

def qradar_pipeline() -> ProcessingPipeline:
    return ProcessingPipeline(
        name="QRadar field mapping",
        priority=20,
        items=[
            ProcessingItem(
                identifier="qradar_field_mapping",
                transformation=FieldMappingTransformation({
                    "TargetFilename": '"File Path"',
                    "Image": '"Process Path"',
                    "CommandLine": '"Process CommandLine"',
                    }),
                   
            )
        ],
    )